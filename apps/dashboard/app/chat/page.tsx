'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/auth-client';
import { fetchCameras, type Camera } from '@/lib/api';
import { MessageCircle, ChevronDown, X } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  ScrollArea,
  ScrollBar,
  Avatar,
  Badge,
  Separator,
  Toaster,
} from '../../components/ui';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; cameraId?: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://oversight-api.digitsoftafrica.com';

  useEffect(() => {
    loadCameras();
    // Add a welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Bonjour ! Je suis votre assistant IA OVERSIGHT. Comment puis-je vous aider aujourd’hui ?',
      },
    ]);
  }, []);

  const loadCameras = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/chat/cameras`);
      if (!res.ok) throw new Error('Impossible de charger les caméras');
      const data = await res.json();
      setCameras(Array.isArray(data) ? data : (data.data || []));
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement des caméras');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      cameraId: undefined as string | undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          cameraId: selectedCameraId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erreur lors de la communication avec l\'IA');
      }

      const data = await res.json();
      const aiMessage = {
        id: Date.now().toString() + 'a',
        role: 'assistant' as const,
        content: data.answer,
        cameraId: data.camerasQueried.length > 0 ? data.camerasQueried[0] : undefined,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (e: any) {
      setError(e.message || 'Erreur inattendue');
      // Remove the user message we just added on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      // Scroll to the bottom
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant' as const,
        content: 'Bonjour ! Je suis votre assistant IA OVERSIGHT. Comment puis-je vous aider aujourd’hui ?',
      },
    ]);
    setSelectedCameraId(undefined);
  };

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader className="pb-2">
          <CardTitle>Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => setError(null)} variant="outline">
            Fermer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <Toaster />
      <div className="flex-1 overflow-hidden">
        <Card className="h-full overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat IA</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  aria-label="Effacer la conversation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-4" ref={messagesEndRef}>
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'flex max-w-[80%]',
                    message.role === 'user'
                      ? 'ml-auto justify-end'
                      : 'mr-auto justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted/20 text-muted-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.cameraId && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Caméra : {cameras.find(c => c.id === message.cameraId)?.name ?? 'Inconnue'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardHeader className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-[200px]">
                <SelectPrimitive.Root
                  value={selectedCameraId ?? ''}
                  onValueChange={(val) => setSelectedCameraId(val === '' ? undefined : val)}
                >
                  <SelectPrimitive.Trigger>
                    <SelectPrimitive.Value placeholder="Toutes les caméras" />
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </SelectPrimitive.Trigger>
                  <SelectPrimitive.Content>
                    {cameras.map(camera => (
                      <SelectPrimitive.Item key={camera.id} value={camera.id}>
                        {camera.name}
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Content>
                </SelectPrimitive.Root>
              </div>
              <Input
                placeholder="Posez une question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                {loading ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
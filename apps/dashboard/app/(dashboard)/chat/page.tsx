'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchChatCameras, sendChatMessage, type ChatMessageDto } from '@/lib/api';
import { X, ChevronDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@radix-ui/react-select';

export default function ChatPage() {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      cameraName?: string;
      snapshotIncluded?: boolean;
    }>
  >([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [cameras, setCameras] = useState<
    Array<{
      id: string;
      name: string;
      status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DEGRADED';
      siteName?: string;
    }>
  >([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadCameras();
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Bonjour ! Je suis votre assistant IA OVERSIGHT. Comment puis-je vous aider aujourd\'hui ?',
      },
    ]);
  }, []);

  const loadCameras = async () => {
    setCamerasLoading(true);
    try {
      const res = await fetchChatCameras();
      setCameras(
        res.map((cam) => ({
          id: cam.id,
          name: cam.name,
          status: cam.status,
          siteName: cam.siteName,
        }))
      );
    } catch (e: any) {
      setError(e.message || 'Impossible de charger les caméras');
    } finally {
      setCamerasLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    // Build history from previous messages (last 5 exchanges)
    const history = messages
      .slice(-10) // Last 10 messages (5 exchanges)
      .map((msg) => msg.content);

    const dto: ChatMessageDto = {
      message: input,
      cameraId: selectedCameraId,
      history: history.length > 0 ? history : undefined,
    };

    try {
      const res = await sendChatMessage(dto);
      const aiMessage = {
        id: Date.now().toString() + 'a',
        role: 'assistant' as const,
        content: res.answer,
        cameraName:
          res.camerasQueried.length > 0
            ? res.camerasQueried[0] // This is camera ID, we need to find name
            : undefined,
        snapshotIncluded: res.snapshotIncluded,
      };

      // Find camera name from ID if available
      if (res.camerasQueried.length > 0) {
        const camera = cameras.find((c) => c.id === res.camerasQueried[0]);
        if (camera) {
          aiMessage.cameraName = camera.name;
        }
      }

      setMessages((prev) => [...prev, aiMessage]);
    } catch (e: any) {
      setError(e.message || 'Erreur inattendue');
      setMessages((prev) => prev.slice(0, -1)); // Remove the user message we just added
    } finally {
      setLoading(false);
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Bonjour ! Je suis votre assistant IA OVERSIGHT. Comment puis-je vous aider aujourd\'hui ?',
      },
    ]);
    setSelectedCameraId(undefined);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-2">
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => setError(null)} variant="outline" className="mt-4">
              Fermer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat IA</h2>
              <Button variant="ghost" size="icon" onClick={clearChat} aria-label="Effacer la conversation">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-4 py-0">
            <div className="space-y-4 pb-4" ref={messagesEndRef}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex max-w-[80%]',
                    message.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted/20 text-muted-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.cameraName && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Caméra : {message.cameraName}
                      </div>
                    )}
                    {message.snapshotIncluded && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        📷 Image analysée
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && messages.length > 1 && (
                <div className="flex max-w-[80%] mr-auto justify-start">
                  <div className="rounded-lg px-4 py-2 bg-muted/20 text-muted-foreground">
                    <p className="whitespace-pre-wrap">L'IA réfléchit...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardHeader className="pt-4 shrink-0 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-[200px]">
                <SelectPrimitive.Root
                  value={selectedCameraId ?? ''}
                  onValueChange={(val) => setSelectedCameraId(val === '' ? undefined : val)}
                  disabled={camerasLoading}
                >
                  <SelectPrimitive.Trigger className="inline-flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <SelectPrimitive.Value placeholder="Toutes les caméras" />
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </SelectPrimitive.Trigger>
                  <SelectPrimitive.Portal>
                    <SelectPrimitive.Content className="z-50 rounded-md border bg-popover p-1 shadow-md">
                      <SelectPrimitive.Item value="" className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                        <SelectPrimitive.ItemText>Toutes les caméras</SelectPrimitive.ItemText>
                      </SelectPrimitive.Item>
                      {cameras.map((camera) => (
                        <SelectPrimitive.Item
                          key={camera.id}
                          value={camera.id}
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <SelectPrimitive.ItemText>{camera.name}</SelectPrimitive.ItemText>
                        </SelectPrimitive.Item>
                      ))}
                    </SelectPrimitive.Content>
                  </SelectPrimitive.Portal>
                </SelectPrimitive.Root>
              </div>
              <Input
                placeholder="Posez une question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                {loading ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
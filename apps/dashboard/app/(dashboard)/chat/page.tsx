'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchChatCameras, sendChatMessage, type ChatMessageDto } from '@/lib/api';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/context';

const STORAGE_KEY = 'oversight-chat-messages';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant' as const,
  content: "Bonjour ! Je suis votre assistant IA OVERSIGHT. Comment puis-je vous aider aujourd'hui ?",
};

export default function ChatPage() {
  const { t } = useTranslation();
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
  const initialized = useRef(false);

  useEffect(() => {
    loadCameras();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          initialized.current = true;
          return;
        }
      } catch {}
    }
    setMessages([WELCOME_MESSAGE]);
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

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
    } catch {
      setError('Impossible de charger les caméras');
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

    const history = messages
      .slice(-10)
      .map((msg) => msg.content);

    const dto: ChatMessageDto = {
      message: input,
      cameraId: selectedCameraId,
      history: history.length > 0 ? history : undefined,
    };

    try {
      const res = await sendChatMessage(dto);
      let cameraName: string | undefined;
      if (res.camerasQueried.length > 0) {
        const camera = cameras.find((c) => c.id === res.camerasQueried[0]);
        cameraName = camera?.name ?? res.camerasQueried[0];
      }

      const aiMessage = {
        id: Date.now().toString() + 'a',
        role: 'assistant' as const,
        content: res.answer,
        cameraName,
        snapshotIncluded: res.snapshotIncluded,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setError(t('chat.unexpectedError'));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([WELCOME_MESSAGE]);
    setSelectedCameraId(undefined);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-2">
            <CardTitle>{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => setError(null)} variant="outline" className="mt-4">
              {t('common.close')}
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
              <select
                value={selectedCameraId ?? ''}
                onChange={(e) => setSelectedCameraId(e.target.value === '' ? undefined : e.target.value)}
                disabled={camerasLoading}
                className="w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Toutes les caméras</option>
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
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

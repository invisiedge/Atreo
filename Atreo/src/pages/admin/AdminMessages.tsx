import { useState, useEffect } from 'react';
import { FiMessageCircle, FiSend, FiSearch } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '../../services/api';
import type { Message as ApiMessage } from '../../services/api/messages.api';
import { logger } from '../../lib/logger';

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await apiClient.getMessages({ page: 1, limit: 20 });
      const normalizedMessages: Message[] = response.messages.map((msg: ApiMessage) => ({
        id: msg._id || '',
        from: msg.from?.name || msg.from?.email || 'System',
        to: msg.to?.name || msg.to?.email || 'Unknown',
        subject: msg.subject,
        content: msg.content,
        timestamp: msg.createdAt,
        read: msg.isRead,
        priority: msg.priority === 'urgent' ? 'high' : (msg.priority as Message['priority']),
      }));
      setMessages(normalizedMessages);
      setLoading(false);
    } catch (error: any) {
      logger.error('Error loading messages:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FiMessageCircle className="h-8 w-8 text-gray-700" />
          <h2 className="text-2xl font-bold text-foreground">Messages</h2>
        </div>
        <Button>
          <FiSend className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Messages</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <FiMessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No messages</h3>
              <p className="mt-1 text-sm text-gray-500">Messages will appear here when available.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{message.from}</span>
                        <Badge variant={message.priority === 'high' ? 'destructive' : 'secondary'}>
                          {message.priority}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold mt-1">{message.subject}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{message.content}</p>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

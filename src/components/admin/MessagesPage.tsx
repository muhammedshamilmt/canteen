'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterMutation } from '@/lib/cache-invalidate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, MessageSquare, Trash } from 'lucide-react';

interface Message {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read';
}

const MessagesPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: () => apiClient.get('/api/messages'),
    staleTime: 60 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/messages?id=${id}`),
    onSuccess: () => invalidateAfterMutation(queryClient, 'messages'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/messages?id=${id}`),
    onSuccess: () => { invalidateAfterMutation(queryClient, 'messages'); toast.success('Message deleted successfully'); },
    onError: () => toast.error('Failed to delete message'),
  });

  const filteredMessages = messages.filter(m =>
    (m.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (m.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (m.message?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleViewMessage = (message: Message) => {
    setSelectedMessage({ ...message, status: 'read' });
    setIsDialogOpen(true);
    if (message.status === 'unread') markReadMutation.mutate(message._id);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Inbox</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-4">Loading messages...</TableCell></TableRow>
                ) : filteredMessages.length > 0 ? filteredMessages.map(message => (
                  <TableRow key={message._id} className={message.status === 'unread' ? 'bg-blue-50' : ''}>
                    <TableCell><span className={`inline-block w-2 h-2 rounded-full ${message.status === 'unread' ? 'bg-blue-500' : 'bg-gray-300'}`} /></TableCell>
                    <TableCell className="font-medium">{message.subject}</TableCell>
                    <TableCell>{message.name}</TableCell>
                    <TableCell>{formatDate(message.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleViewMessage(message)}><MessageSquare className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(message._id)}><Trash className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No messages found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{selectedMessage?.subject}</DialogTitle></DialogHeader>
          {selectedMessage && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <div>From: <span className="font-medium text-foreground">{selectedMessage.name} ({selectedMessage.email})</span></div>
                <div>Date: <span className="font-medium text-foreground">{formatDate(selectedMessage.createdAt)}</span></div>
              </div>
              <div className="rounded-md bg-muted/50 p-4 text-sm">{selectedMessage.message}</div>
              <div className="space-y-2 pt-4">
                <Label htmlFor="reply">Reply</Label>
                <Textarea id="reply" placeholder="Type your reply here..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              if (!replyText.trim()) { toast.error('Please enter a reply'); return; }
              toast.success(`Reply sent to ${selectedMessage?.name}`);
              setReplyText('');
              setIsDialogOpen(false);
            }}>Send Reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesPage;

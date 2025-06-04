
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Phone, Video, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ConversationData {
  appointment: {
    id: string;
    patient_id: string;
    doctor_id: string;
    patient_profile: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
    doctor_profile: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
      specialization?: string;
    };
  };
  messages: any[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          appointment:appointments(
            id,
            patient_id,
            doctor_id,
            patient_profile:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
            doctor_profile:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)
          )
        `)
        .or(`appointment.patient_id.eq.${user?.id},appointment.doctor_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group messages by appointment
      const grouped = data?.reduce((acc: any, msg: any) => {
        const appointmentId = msg.appointment_id;
        if (!acc[appointmentId]) {
          acc[appointmentId] = {
            appointment: msg.appointment,
            messages: [],
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount: msg.sender_id !== user?.id && !msg.is_read ? 1 : 0
          };
        } else {
          if (msg.sender_id !== user?.id && !msg.is_read) {
            acc[appointmentId].unreadCount++;
          }
        }
        acc[appointmentId].messages.push(msg);
        return acc;
      }, {});
      
      return Object.values(grouped || {}) as ConversationData[];
    },
    enabled: !!user?.id
  });

  // Fetch messages for selected chat
  const { data: chatMessages } = useQuery({
    queryKey: ['chat-messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('appointment_id', selectedChat)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('appointment_id', selectedChat)
        .neq('sender_id', user?.id);
      
      return data || [];
    },
    enabled: !!selectedChat
  });

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          if (selectedChat) {
            queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChat] });
          }
          
          // Show toast notification for new messages
          if (payload.new.sender_id !== user.id) {
            toast({
              title: 'New Message',
              description: 'You have received a new message',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedChat, queryClient, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          appointment_id: selectedChat,
          sender_id: user?.id,
          message: message.trim(),
          message_type: 'text'
        });
      
      if (error) throw error;
      setMessage('');
      
      // Create notification for the recipient
      const currentConversation = conversations?.find((c) => c.appointment?.id === selectedChat);
      const recipientId = currentConversation?.appointment?.patient_id === user?.id 
        ? currentConversation?.appointment?.doctor_id 
        : currentConversation?.appointment?.patient_id;

      if (recipientId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: recipientId,
            title: 'New Message',
            message: `You have received a new message: ${message.trim().substring(0, 50)}${message.trim().length > 50 ? '...' : ''}`,
            type: 'message'
          });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Mobile view - Chat list or individual chat
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // Show individual chat if selected
    if (selectedChat && chatMessages) {
      const currentConversation = conversations?.find((c) => c.appointment?.id === selectedChat);
      const otherUser = currentConversation?.appointment?.patient_id === user?.id 
        ? currentConversation?.appointment?.doctor_profile 
        : currentConversation?.appointment?.patient_profile;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white dark:bg-gray-800 border-b p-4 flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedChat(null)}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>
                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {otherUser?.first_name} {otherUser?.last_name}
              </h3>
              {user?.role === 'patient' && (
                <Badge variant="secondary" className="text-xs">
                  {t('doctor')}
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Video className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
            {chatMessages.map((msg: any) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    isOwn 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </span>
                      {isOwn && (
                        <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                          {msg.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <div className="bg-white dark:bg-gray-800 border-t p-4 pb-20">
            <div className="flex space-x-2">
              <Input
                placeholder={t('typeMessage')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button size="sm" onClick={sendMessage} className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Show chat list for mobile
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-white dark:bg-gray-800 border-b p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('messages')}</h1>
        </div>

        <div className="p-4">
          {conversations && conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((chat) => {
                const otherUser = chat.appointment?.patient_id === user?.id 
                  ? chat.appointment?.doctor_profile 
                  : chat.appointment?.patient_profile;
                
                return (
                  <Card
                    key={chat.appointment?.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedChat(chat.appointment?.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherUser?.avatar_url} />
                          <AvatarFallback>
                            {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {otherUser?.first_name} {otherUser?.last_name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {format(new Date(chat.lastMessageTime), 'MMM dd')}
                              </span>
                              {chat.unreadCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {user?.role === 'patient' && (
                            <Badge variant="secondary" className="text-xs mb-1">
                              {t('doctor')}
                            </Badge>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {chat.lastMessage}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 text-lg">{t('noConversations')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('bookAppointmentToStart')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view - same as before but with proper styling
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('messages')}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t('communicateWithProviders')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[600px]">
          {/* Chat List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {conversations && conversations.length > 0 ? (
                <div className="space-y-0">
                  {conversations.map((chat) => {
                    const otherUser = chat.appointment?.patient_id === user?.id 
                      ? chat.appointment?.doctor_profile 
                      : chat.appointment?.patient_profile;
                    
                    return (
                      <div
                        key={chat.appointment?.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          selectedChat === chat.appointment?.id ? 'bg-emerald-50 dark:bg-emerald-950' : ''
                        }`}
                        onClick={() => setSelectedChat(chat.appointment?.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={otherUser?.avatar_url} />
                            <AvatarFallback>
                              {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                {otherUser?.first_name} {otherUser?.last_name}
                              </h4>
                              {chat.unreadCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                              {chat.lastMessage}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(chat.lastMessageTime), 'MMM dd, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No conversations yet</p>
                  <p className="text-sm text-gray-500 mt-2">Start a conversation by booking an appointment</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2">
            {selectedChat && chatMessages ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {conversations?.find((c) => c.appointment?.id === selectedChat)?.appointment?.patient_id === user?.id 
                        ? conversations?.find((c) => c.appointment?.id === selectedChat)?.appointment?.doctor_profile?.first_name + ' ' +
                          conversations?.find((c) => c.appointment?.id === selectedChat)?.appointment?.doctor_profile?.last_name
                        : conversations?.find((c) => c.appointment?.id === selectedChat)?.appointment?.patient_profile?.first_name + ' ' +
                          conversations?.find((c) => c.appointment?.id === selectedChat)?.appointment?.patient_profile?.last_name}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col h-full p-0">
                  {/* Messages Area */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
                    {chatMessages.map((msg: any) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwn 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                              {isOwn && (
                                <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                                  {msg.is_read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendMessage();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={sendMessage} className="bg-emerald-600 hover:bg-emerald-700">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

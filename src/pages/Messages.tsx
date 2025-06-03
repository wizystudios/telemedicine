
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Plus, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';

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
    };
  };
  messages: any[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');

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
            unreadCount: 0
          };
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
      return data || [];
    },
    enabled: !!selectedChat
  });

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
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
            <p className="text-gray-600 dark:text-gray-300">Communicate with your healthcare providers</p>
          </div>
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
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {otherUser?.first_name} {otherUser?.last_name}
                            </h4>
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
                            <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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

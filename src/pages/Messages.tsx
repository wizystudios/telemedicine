
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Plus } from 'lucide-react';

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');

  // Mock data for now
  const chats = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      lastMessage: "Please take the medication as prescribed",
      time: "2 min ago",
      unread: 2
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      lastMessage: "Your test results look good",
      time: "1 hour ago",
      unread: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
            <p className="text-gray-600 dark:text-gray-300">Communicate with your healthcare providers</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Chat List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {chats.length > 0 ? (
                <div className="space-y-0">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedChat === chat.id ? 'bg-emerald-50 dark:bg-emerald-950' : ''
                      }`}
                      onClick={() => setSelectedChat(chat.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{chat.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {chat.lastMessage}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{chat.time}</p>
                          {chat.unread > 0 && (
                            <span className="inline-block bg-emerald-600 text-white text-xs rounded-full px-2 py-1 mt-1">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No conversations yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2">
            {selectedChat ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle>
                    {chats.find(c => c.id === selectedChat)?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-full p-0">
                  {/* Messages Area */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
                        <p className="text-sm">Hello! How are you feeling today?</p>
                        <span className="text-xs text-gray-500">10:30 AM</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-emerald-600 text-white rounded-lg p-3 max-w-xs">
                        <p className="text-sm">I'm feeling much better, thank you!</p>
                        <span className="text-xs text-emerald-100">10:32 AM</span>
                      </div>
                    </div>
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
                            // Handle send message
                            setMessage('');
                          }
                        }}
                      />
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
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

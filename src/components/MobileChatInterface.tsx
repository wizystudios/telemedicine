import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Send, 
  Paperclip, 
  Image, 
  Mic, 
  Video,
  Smile
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MobileChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onFileSelect: (files: FileList) => void;
  onVoiceRecord: () => void;
  isRecording?: boolean;
  className?: string;
}

export function MobileChatInterface({
  messages,
  onSendMessage,
  onFileSelect,
  onVoiceRecord,
  isRecording = false,
  className = ""
}: MobileChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = (type: 'file' | 'image' | 'video') => {
    switch (type) {
      case 'file':
        fileInputRef.current?.click();
        break;
      case 'image':
        imageInputRef.current?.click();
        break;
      case 'video':
        videoInputRef.current?.click();
        break;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b px-4 py-3 flex items-center space-x-3">
        <Avatar className="w-12 h-12 ring-2 ring-emerald-100">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-semibold">
            Dr
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Doctor</h3>
          <p className="text-sm text-emerald-600 font-medium">Online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-24">
        {/* Welcome Message */}
        <div className="flex justify-start mb-4">
          <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200 text-base">Hello, how can I help you?</p>
            <p className="text-xs text-gray-500 mt-1">9:40 AM</p>
          </div>
        </div>

        {/* Dynamic Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} mb-3`}>
            {msg.isUser ? (
              <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                <p className="text-base break-words">{msg.text}</p>
                <p className="text-xs opacity-75 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                <p className="text-gray-800 dark:text-gray-200 text-base break-words">{msg.text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="bg-white dark:bg-gray-800 border-t px-4 py-3 fixed bottom-16 left-0 right-0 z-50 shadow-lg">
        <div className="flex items-center space-x-3 max-w-lg mx-auto">
          {/* Attachment Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex-shrink-0"
              >
                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-gray-800 z-[60]">
              <DropdownMenuItem onClick={() => handleFileClick('image')}>
                <Image className="w-4 h-4 mr-2 text-blue-600" />
                Picha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileClick('video')}>
                <Video className="w-4 h-4 mr-2 text-purple-600" />
                Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileClick('file')}>
                <Paperclip className="w-4 h-4 mr-2 text-orange-600" />
                Faili
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onVoiceRecord}>
                <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'text-red-600 animate-pulse' : 'text-green-600'}`} />
                {isRecording ? 'Kurakodi...' : 'Sauti'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="rounded-full bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-blue-500 pr-12 text-base"
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
            >
              <Smile className="w-4 h-4 text-gray-500" />
            </Button>
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend}
            disabled={!message.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept="image/*"
      />
      <input
        ref={videoInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept="video/*"
      />
    </div>
  );
}
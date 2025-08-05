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
    <div className={`flex flex-col h-screen bg-background ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-emerald-500 text-white">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">Chat Bot</h3>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 pb-32">
        {/* Welcome Message */}
        <div className="flex justify-start">
          <div className="flex items-start space-x-2 max-w-[80%]">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-emerald-500 text-white text-xs">
                <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2">
              <p className="text-sm text-foreground">Hello! 👋</p>
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="flex items-start space-x-2 max-w-[80%]">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-emerald-500 text-white text-xs">
                <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2">
              <p className="text-sm text-foreground">How can I help?</p>
            </div>
          </div>
        </div>

        {/* Dynamic Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            {msg.isUser ? (
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2 max-w-[80%]">
                <p className="text-sm">{msg.text}</p>
              </div>
            ) : (
              <div className="flex items-start space-x-2 max-w-[80%]">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-emerald-500 text-white text-xs">
                    <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2">
                  <p className="text-sm text-foreground">{msg.text}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed position above bottom nav */}
      <div className="border-t bg-card p-4 pb-20 fixed bottom-16 left-0 right-0 z-40">
        <div className="flex items-end space-x-2">
          {/* Attachment Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex-shrink-0"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
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
              placeholder="Andika ujumbe..."
              className="pr-12 rounded-full bg-muted border-0 focus:ring-2 focus:ring-primary/20"
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
            >
              <Smile className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend}
            disabled={!message.trim()}
            size="icon"
            className="h-10 w-10 rounded-full flex-shrink-0"
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
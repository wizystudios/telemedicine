import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Send, 
  Paperclip, 
  Image, 
  Mic, 
  Video, 
  FileText,
  X
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  onFileSelect: (files: FileList) => void;
  onVoiceRecord: () => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  isRecording?: boolean;
}

export function EnhancedChatInput({
  message,
  setMessage,
  onSendMessage,
  onFileSelect,
  onVoiceRecord,
  selectedFiles,
  onRemoveFile,
  isRecording = false
}: EnhancedChatInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t bg-white dark:bg-gray-800 p-4">
      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 text-sm"
            >
              {file.type.startsWith('image/') ? (
                <Image className="w-4 h-4 text-blue-600" />
              ) : file.type.startsWith('video/') ? (
                <Video className="w-4 h-4 text-purple-600" />
              ) : file.type.startsWith('audio/') ? (
                <Mic className="w-4 h-4 text-green-600" />
              ) : (
                <FileText className="w-4 h-4 text-orange-600" />
              )}
              <span className="max-w-32 truncate">{file.name}</span>
              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(index)}
                className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Plus Button for Attachments */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800"
            >
              <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
        <div className="flex-1">
          {isExpanded ? (
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Andika ujumbe..."
              className="min-h-[40px] max-h-32 resize-none"
              rows={2}
              onFocus={() => setIsExpanded(true)}
              onBlur={() => {
                if (!message.trim()) {
                  setIsExpanded(false);
                }
              }}
            />
          ) : (
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Andika ujumbe..."
              onFocus={() => setIsExpanded(true)}
              className="h-10"
            />
          )}
        </div>

        {/* Send Button */}
        <Button 
          onClick={onSendMessage}
          disabled={!message.trim() && selectedFiles.length === 0}
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
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
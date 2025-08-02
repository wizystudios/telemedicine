import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  userId: string;
  userName: string;
  onImageUpdate: (url: string) => void;
}

export function ProfileImageUpload({ 
  currentImageUrl, 
  userId, 
  userName, 
  onImageUpdate 
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali chagua picha tu',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Hitilafu',
        description: 'Picha ni kubwa mno. Chagua picha ndogo kuliko 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      // Create unique filename with proper folder structure for RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      onImageUpdate(publicUrl);
      toast({
        title: 'Imefanikiwa',
        description: 'Picha ya profile imesasishwa',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Hitilafu',
        description: error.message || 'Imeshindwa kupakia picha',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    const names = userName.split(' ');
    return names.map(name => name[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="w-24 h-24">
          <AvatarImage src={currentImageUrl} />
          <AvatarFallback className="text-lg">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <Button
          size="sm"
          variant="secondary"
          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleUploadClick}
        disabled={isUploading}
        className="flex items-center space-x-2"
      >
        <Upload className="w-4 h-4" />
        <span>{isUploading ? 'Inapakia...' : 'Badilisha Picha'}</span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
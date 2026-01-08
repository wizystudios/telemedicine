import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DoctorImageUploadProps {
  currentImageUrl?: string;
  doctorId: string;
  doctorName: string;
  onImageUpdate: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function DoctorImageUpload({ 
  currentImageUrl, 
  doctorId, 
  doctorName, 
  onImageUpdate,
  size = 'md'
}: DoctorImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali chagua picha tu',
        variant: 'destructive'
      });
      return;
    }

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
      const fileExt = file.name.split('.').pop();
      const fileName = `doctor_${doctorId}_${Date.now()}.${fileExt}`;
      const filePath = `doctors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update doctor's profile avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', doctorId);

      if (updateError) throw updateError;

      onImageUpdate(publicUrl);
      toast({
        title: 'Imefanikiwa',
        description: 'Picha ya daktari imesasishwa',
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

  const getInitials = () => {
    const names = doctorName.split(' ');
    return names.slice(0, 2).map(name => name[0]).join('').toUpperCase();
  };

  return (
    <div className="relative group">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={currentImageUrl} alt={doctorName} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      
      <Button
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 rounded-full w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Camera className="w-3 h-3" />
        )}
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

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Loader2, Building, Pill, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  entityId: string;
  entityType: 'hospital' | 'pharmacy' | 'laboratory' | 'polyclinic';
  onLogoUpdated: (url: string) => void;
}

export function LogoUpload({ currentLogoUrl, entityId, entityType, onLogoUpdated }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getIcon = () => {
    switch (entityType) {
      case 'hospital': return <Building className="h-8 w-8" />;
      case 'pharmacy': return <Pill className="h-8 w-8" />;
      case 'laboratory': return <TestTube className="h-8 w-8" />;
      case 'polyclinic': return <Building className="h-8 w-8" />;
    }
  };

  const getTableName = (): 'hospitals' | 'pharmacies' | 'laboratories' | 'polyclinics' => {
    switch (entityType) {
      case 'hospital': return 'hospitals';
      case 'pharmacy': return 'pharmacies';
      case 'laboratory': return 'laboratories';
      case 'polyclinic': return 'polyclinics';
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Kosa', description: 'Chagua picha tu', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: 'Kosa', description: 'Picha kubwa mno (max 5MB)', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityType}/${entityId}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('institution-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('institution-logos')
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from(getTableName())
        .update({ logo_url: publicUrl })
        .eq('id', entityId);

      if (updateError) throw updateError;

      onLogoUpdated(publicUrl);
      toast({ title: 'Imefanikiwa!', description: 'Logo imesasishwa' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleUpload}
      />
      <Avatar className="h-20 w-20 border-2 border-border">
        <AvatarImage src={currentLogoUrl || ''} />
        <AvatarFallback className="bg-muted">
          {getIcon()}
        </AvatarFallback>
      </Avatar>
      <Button
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

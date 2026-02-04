import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, FileText, Plus, Trash2, Eye, Heart, Upload, Image, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ContentUploadSectionProps {
  institutionType: 'hospital' | 'pharmacy' | 'laboratory' | 'doctor' | 'polyclinic';
  institutionId?: string;
  contents?: any[];
  onRefresh?: () => void;
}

export function ContentUploadSection({ 
  institutionType, 
  institutionId, 
  contents = [], 
  onRefresh = () => {} 
}: ContentUploadSectionProps) {
  const { user } = useAuth();
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    contentType: 'video',
    contentUrl: '',
    thumbnailUrl: ''
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('institution-logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('institution-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleAddContent = async () => {
    if (!contentForm.title) {
      toast({ title: 'Kosa', description: 'Jina linahitajika', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    let contentUrl = contentForm.contentUrl;
    let thumbnailUrl = contentForm.thumbnailUrl;

    try {
      // Upload content file if selected
      if (selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile, 'content');
        if (uploadedUrl) {
          contentUrl = uploadedUrl;
        } else {
          toast({ title: 'Kosa', description: 'Imeshindwa kupakia faili', variant: 'destructive' });
          setIsUploading(false);
          return;
        }
      }

      // Upload thumbnail if selected
      if (selectedThumbnail) {
        const uploadedThumb = await uploadFile(selectedThumbnail, 'thumbnails');
        if (uploadedThumb) {
          thumbnailUrl = uploadedThumb;
        }
      }

      const { error } = await supabase
        .from('institution_content')
        .insert([{
          owner_id: user?.id,
          institution_type: institutionType,
          institution_id: institutionId,
          title: contentForm.title,
          description: contentForm.description,
          content_type: contentForm.contentType,
          content_url: contentUrl,
          thumbnail_url: thumbnailUrl
        }]);

      if (error) {
        toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Imefanikiwa', description: 'Maudhui yameongezwa' });
        setContentForm({ title: '', description: '', contentType: 'video', contentUrl: '', thumbnailUrl: '' });
        setSelectedFile(null);
        setSelectedThumbnail(null);
        setIsAddingContent(false);
        onRefresh();
      }
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteContent = async (id: string) => {
    await supabase.from('institution_content').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    onRefresh();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: 'Faili kubwa sana', description: 'Ukubwa wa faili usizidi 50MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Picha kubwa sana', description: 'Ukubwa wa picha usizidi 5MB', variant: 'destructive' });
        return;
      }
      setSelectedThumbnail(file);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            Maudhui ({contents.length})
          </CardTitle>
          <Dialog open={isAddingContent} onOpenChange={setIsAddingContent}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs rounded-xl">
                <Plus className="h-3 w-3 mr-1" />
                Ongeza
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Ongeza Maudhui Mapya</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Jina *</Label>
                  <Input 
                    placeholder="Jina la video/makala" 
                    value={contentForm.title} 
                    onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} 
                    className="rounded-xl"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Aina</Label>
                  <Select 
                    value={contentForm.contentType} 
                    onValueChange={(v) => setContentForm({ ...contentForm, contentType: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="article">Makala</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="image">Picha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label className="text-xs">Pakia Faili (Video/Picha)</Label>
                  <div 
                    className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <Upload className="h-4 w-4" />
                        {selectedFile.name}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="h-6 w-6 mx-auto mb-1" />
                        <p className="text-xs">Bofya kupakia video au picha</p>
                        <p className="text-[10px]">Max 50MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="space-y-2">
                  <Label className="text-xs">Picha ya Kifuniko (Thumbnail)</Label>
                  <div 
                    className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                    />
                    {selectedThumbnail ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <Image className="h-4 w-4" />
                        {selectedThumbnail.name}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">
                        <Image className="h-4 w-4 mx-auto mb-1" />
                        Picha ya thumbnail (hiari)
                      </div>
                    )}
                  </div>
                </div>

                {/* OR use URL */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">au tumia link</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Link ya Video/Makala</Label>
                  <Input 
                    placeholder="https://youtube.com/..." 
                    value={contentForm.contentUrl} 
                    onChange={(e) => setContentForm({ ...contentForm, contentUrl: e.target.value })} 
                    className="rounded-xl"
                    disabled={!!selectedFile}
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Maelezo</Label>
                  <Textarea 
                    placeholder="Maelezo mafupi..." 
                    value={contentForm.description} 
                    onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })} 
                    className="rounded-xl"
                  />
                </div>
                
                <Button 
                  onClick={handleAddContent} 
                  className="w-full rounded-xl"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inapakia...
                    </>
                  ) : (
                    'Ongeza'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contents.length > 0 ? (
          <div className="space-y-2">
            {contents.map((content) => (
              <div key={content.id} className="p-3 rounded-xl border bg-card flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {content.thumbnail_url ? (
                      <img src={content.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : content.content_type === 'video' ? (
                      <Video className="h-5 w-5 text-primary" />
                    ) : content.content_type === 'image' ? (
                      <Image className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{content.title}</p>
                    {content.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{content.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {content.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {content.likes_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteContent(content.id)} className="rounded-xl">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-4">
            Hakuna maudhui - bofya "Ongeza" kupakia video, picha au makala
          </p>
        )}
      </CardContent>
    </Card>
  );
}

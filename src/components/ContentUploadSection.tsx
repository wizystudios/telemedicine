import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, FileText, Plus, Trash2, Eye, Heart } from 'lucide-react';
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
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    contentType: 'video',
    contentUrl: ''
  });

  const handleAddContent = async () => {
    if (!contentForm.title || !contentForm.contentUrl) {
      toast({ title: 'Kosa', description: 'Jina na link vinahitajika', variant: 'destructive' });
      return;
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
        content_url: contentForm.contentUrl
      }]);

    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Maudhui yameongezwa' });
      setContentForm({ title: '', description: '', contentType: 'video', contentUrl: '' });
      setIsAddingContent(false);
      onRefresh();
    }
  };

  const deleteContent = async (id: string) => {
    await supabase.from('institution_content').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    onRefresh();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            Maudhui ({contents.length})
          </CardTitle>
          <Dialog open={isAddingContent} onOpenChange={setIsAddingContent}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Ongeza Maudhui
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
                  />
                </div>
                <div>
                  <Label className="text-xs">Aina</Label>
                  <Select 
                    value={contentForm.contentType} 
                    onValueChange={(v) => setContentForm({ ...contentForm, contentType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="article">Makala</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Link ya Video/Makala *</Label>
                  <Input 
                    placeholder="https://youtube.com/..." 
                    value={contentForm.contentUrl} 
                    onChange={(e) => setContentForm({ ...contentForm, contentUrl: e.target.value })} 
                  />
                </div>
                <div>
                  <Label className="text-xs">Maelezo</Label>
                  <Textarea 
                    placeholder="Maelezo mafupi..." 
                    value={contentForm.description} 
                    onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })} 
                  />
                </div>
                <Button onClick={handleAddContent} className="w-full">Ongeza</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contents.length > 0 ? (
          <div className="space-y-2">
            {contents.map((content) => (
              <div key={content.id} className="p-3 rounded-lg border bg-card flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {content.content_type === 'video' ? (
                      <Video className="h-5 w-5 text-primary" />
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
                <Button size="sm" variant="ghost" onClick={() => deleteContent(content.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-4">
            Hakuna maudhui - bofya "Ongeza Maudhui" kupakia video au makala
          </p>
        )}
      </CardContent>
    </Card>
  );
}
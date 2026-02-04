import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BookOpen, Plus, Trash2, Eye, Heart, Upload, Image, 
  Loader2, Tag, Send, Video, FileText 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HealthTipsSectionProps {
  onRefresh?: () => void;
}

export function HealthTipsSection({ onRefresh = () => {} }: HealthTipsSectionProps) {
  const { user } = useAuth();
  const [isAddingTip, setIsAddingTip] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [tipForm, setTipForm] = useState({
    title: '',
    content: '',
    tags: '',
    imageUrl: ''
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  useState(() => {
    fetchPosts();
  });

  const fetchPosts = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('doctor_posts')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false });
    
    setPosts(data || []);
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `posts/${user?.id}/${fileName}`;

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

  const handleAddTip = async () => {
    if (!tipForm.title || !tipForm.content) {
      toast({ title: 'Kosa', description: 'Jina na maelezo vinahitajika', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      // Parse tags
      const tags = tipForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Upload image if selected
      let contentWithImage = tipForm.content;
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (uploadedUrl) {
          contentWithImage = `![Picha](${uploadedUrl})\n\n${tipForm.content}`;
        }
      }

      const { error } = await supabase
        .from('doctor_posts')
        .insert([{
          doctor_id: user?.id,
          title: tipForm.title,
          content: contentWithImage,
          tags: tags.length > 0 ? tags : null,
          is_published: true
        }]);

      if (error) {
        toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Imefanikiwa', description: 'Makala yameongezwa' });
        setTipForm({ title: '', content: '', tags: '', imageUrl: '' });
        setSelectedImage(null);
        setIsAddingTip(false);
        fetchPosts();
        onRefresh();
      }
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteTip = async (id: string) => {
    await supabase.from('doctor_posts').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    fetchPosts();
    onRefresh();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Picha kubwa sana', description: 'Ukubwa wa picha usizidi 10MB', variant: 'destructive' });
        return;
      }
      setSelectedImage(file);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Makala na Ushauri wa Afya ({posts.length})
          </CardTitle>
          <Dialog open={isAddingTip} onOpenChange={setIsAddingTip}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs rounded-xl">
                <Plus className="h-3 w-3 mr-1" />
                Andika Makala
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Andika Makala Mpya
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Kichwa cha Makala *</Label>
                  <Input 
                    placeholder="Mfano: Jinsi ya Kudhibiti Kisukari" 
                    value={tipForm.title} 
                    onChange={(e) => setTipForm({ ...tipForm, title: e.target.value })} 
                    className="rounded-xl"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label className="text-xs">Picha ya Makala</Label>
                  <div 
                    className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {selectedImage ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <Image className="h-4 w-4" />
                        {selectedImage.name}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Image className="h-6 w-6 mx-auto mb-1" />
                        <p className="text-xs">Bofya kupakia picha</p>
                        <p className="text-[10px]">Max 10MB - PNG, JPG</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Maelezo Kamili *</Label>
                  <Textarea 
                    placeholder="Andika maelezo kamili ya makala yako hapa..."
                    value={tipForm.content} 
                    onChange={(e) => setTipForm({ ...tipForm, content: e.target.value })} 
                    className="rounded-xl min-h-[150px]"
                  />
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Tags (tenganisha na koma)
                  </Label>
                  <Input 
                    placeholder="Mfano: kisukari, lishe, afya" 
                    value={tipForm.tags} 
                    onChange={(e) => setTipForm({ ...tipForm, tags: e.target.value })} 
                    className="rounded-xl"
                  />
                </div>
                
                <Button 
                  onClick={handleAddTip} 
                  className="w-full rounded-xl"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inapakia...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Chapisha Makala
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="p-3 rounded-xl border bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {post.content.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 100)}...
                    </p>
                    
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] rounded-full">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {post.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {post.likes_count || 0}
                      </span>
                      <span>
                        {new Date(post.created_at).toLocaleDateString('sw-TZ')}
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteTip(post.id)} 
                    className="rounded-xl"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              Hakuna makala - bofya "Andika Makala" kushiriki ushauri wa afya
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

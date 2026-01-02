import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Pill, Package, Plus, Loader2, Trash2, MapPin, Phone, Mail, TrendingUp,
  Edit, Upload, Video, Quote, Clock, AlertCircle, Building2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function PharmacyOwnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [contents, setContents] = useState<any[]>([]);
  
  // Medicine form with full details
  const [form, setForm] = useState({ 
    name: '', 
    category: '', 
    price: '', 
    description: '',
    usageInstructions: '',
    targetAudience: 'all',
    dosage: '',
    sideEffects: '',
    requiresPrescription: false
  });

  // Profile edit form
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    fax: '',
    poBox: '',
    description: '',
    quoteOfDay: '',
    emergencyAvailable: false
  });

  // Content form
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    contentType: 'video',
    contentUrl: ''
  });

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    try {
      const { data: pharmacyData } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (!pharmacyData) {
        setLoading(false);
        return;
      }

      setPharmacy(pharmacyData);
      setProfileForm({
        name: pharmacyData.name || '',
        address: pharmacyData.address || '',
        phone: pharmacyData.phone || '',
        email: pharmacyData.email || '',
        fax: (pharmacyData as any).fax || '',
        poBox: (pharmacyData as any).po_box || '',
        description: pharmacyData.description || '',
        quoteOfDay: (pharmacyData as any).quote_of_day || '',
        emergencyAvailable: (pharmacyData as any).emergency_available || false
      });

      const { data: medsData } = await supabase
        .from('pharmacy_medicines')
        .select('*')
        .eq('pharmacy_id', pharmacyData.id)
        .order('created_at', { ascending: false });

      setMedicines(medsData || []);

      // Fetch contents
      const { data: contentsData } = await supabase
        .from('institution_content')
        .select('*')
        .eq('institution_type', 'pharmacy')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      setContents(contentsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name) {
      toast({ title: 'Kosa', description: 'Jina la dawa linahitajika', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('pharmacy_medicines')
      .insert([{
        pharmacy_id: pharmacy.id,
        name: form.name,
        category: form.category,
        price: form.price ? parseFloat(form.price) : null,
        description: form.description,
        usage_instructions: form.usageInstructions,
        target_audience: form.targetAudience,
        dosage: form.dosage,
        side_effects: form.sideEffects,
        requires_prescription: form.requiresPrescription,
        in_stock: true
      }] as any);

    if (error) {
      toast({ title: 'Kosa', description: 'Imeshindikana', variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Dawa imeongezwa na maelezo yote' });
      setForm({ 
        name: '', category: '', price: '', description: '',
        usageInstructions: '', targetAudience: 'all', dosage: '', sideEffects: '', requiresPrescription: false
      });
      setIsAdding(false);
      fetchData();
    }
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase
      .from('pharmacies')
      .update({
        name: profileForm.name,
        address: profileForm.address,
        phone: profileForm.phone,
        email: profileForm.email,
        fax: profileForm.fax,
        po_box: profileForm.poBox,
        description: profileForm.description,
        quote_of_day: profileForm.quoteOfDay,
        emergency_available: profileForm.emergencyAvailable
      } as any)
      .eq('id', pharmacy.id);

    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Taarifa zimesasishwa' });
      setIsEditingProfile(false);
      fetchData();
    }
  };

  const handleAddContent = async () => {
    if (!contentForm.title || !contentForm.contentUrl) {
      toast({ title: 'Kosa', description: 'Jina na link vinahitajika', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('institution_content')
      .insert([{
        owner_id: user?.id,
        institution_type: 'pharmacy',
        institution_id: pharmacy.id,
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
      fetchData();
    }
  };

  const toggleStock = async (id: string, inStock: boolean) => {
    await supabase.from('pharmacy_medicines').update({ in_stock: !inStock }).eq('id', id);
    fetchData();
  };

  const deleteMedicine = async (id: string) => {
    await supabase.from('pharmacy_medicines').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    fetchData();
  };

  const deleteContent = async (id: string) => {
    await supabase.from('institution_content').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    fetchData();
  };

  const inStock = medicines.filter(m => m.in_stock).length;
  const outOfStock = medicines.length - inStock;

  const chartData = [
    { name: 'Inapatikana', value: inStock, color: 'hsl(142, 76%, 36%)' },
    { name: 'Haipatikani', value: outOfStock, color: 'hsl(0, 84%, 60%)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="p-4 text-center">
        <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Hakuna Famasi</h2>
        <p className="text-sm text-muted-foreground">Wasiliana na Super Admin kusajili famasi yako</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
            {pharmacy.logo_url ? (
              <img src={pharmacy.logo_url} alt={pharmacy.name} className="h-10 w-10 rounded object-cover" />
            ) : (
              <Pill className="h-6 w-6 text-pink-600" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold">{pharmacy.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {pharmacy.address}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditingProfile(true)}>
            <Edit className="h-3 w-3 mr-1" /> Hariri
          </Button>
          <Badge variant={pharmacy.is_verified ? 'default' : 'secondary'}>
            {pharmacy.is_verified ? 'Imethibitishwa' : 'Inasubiri'}
          </Badge>
        </div>
      </div>

      {/* Quote of the Day */}
      {(pharmacy as any).quote_of_day && (
        <Card className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border-pink-200 dark:border-pink-800">
          <CardContent className="p-3 flex items-center gap-2">
            <Quote className="h-4 w-4 text-pink-500" />
            <p className="text-sm italic">{(pharmacy as any).quote_of_day}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="medicines" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="medicines">Dawa</TabsTrigger>
          <TabsTrigger value="profile">Taarifa</TabsTrigger>
          <TabsTrigger value="content">Maudhui</TabsTrigger>
        </TabsList>

        <TabsContent value="medicines" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{medicines.length}</p>
                    <p className="text-[10px] text-muted-foreground">Jumla ya Dawa</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <ResponsiveContainer width="100%" height={60}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" innerRadius={15} outerRadius={25}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3 text-[10px]">
                  <span className="text-green-600">● {inStock} Ipo</span>
                  <span className="text-red-500">● {outOfStock} Haipo</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Dawa ({medicines.length})
                </CardTitle>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Ongeza Dawa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Ongeza Dawa - Maelezo Kamili</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Jina la Dawa *</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Aina/Category</Label>
                          <Input placeholder="mfano: Antibiotic" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Bei (TZS)</Label>
                          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Kipimo/Dosage</Label>
                        <Input placeholder="mfano: 500mg, 2 mara kwa siku" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Inafaa kwa Nani?</Label>
                        <Select value={form.targetAudience} onValueChange={(v) => setForm({ ...form, targetAudience: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Wote</SelectItem>
                            <SelectItem value="adults">Watu Wazima</SelectItem>
                            <SelectItem value="children">Watoto</SelectItem>
                            <SelectItem value="pregnant">Wajawazito</SelectItem>
                            <SelectItem value="elderly">Wazee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Jinsi ya Kutumia</Label>
                        <Textarea 
                          placeholder="Eleza jinsi dawa inavyotumiwa..." 
                          value={form.usageInstructions} 
                          onChange={(e) => setForm({ ...form, usageInstructions: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Madhara/Side Effects</Label>
                        <Textarea 
                          placeholder="Madhara yanayoweza kutokea..." 
                          value={form.sideEffects} 
                          onChange={(e) => setForm({ ...form, sideEffects: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Maelezo Mengine</Label>
                        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={form.requiresPrescription} 
                          onCheckedChange={(v) => setForm({ ...form, requiresPrescription: v })} 
                        />
                        <Label className="text-xs">Inahitaji Cheti cha Daktari</Label>
                      </div>
                      <Button onClick={handleAdd} className="w-full">Ongeza Dawa</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {medicines.length > 0 ? (
                <div className="space-y-2">
                  {medicines.map((med) => (
                    <div key={med.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{med.name}</p>
                            {med.requires_prescription && (
                              <Badge variant="outline" className="text-[9px]">Rx</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {med.category && <span>{med.category}</span>}
                            {med.price && <span>• {med.price} TZS</span>}
                            {med.dosage && <span>• {med.dosage}</span>}
                          </div>
                          {med.target_audience && med.target_audience !== 'all' && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Inafaa: {med.target_audience === 'adults' ? 'Watu Wazima' : 
                                       med.target_audience === 'children' ? 'Watoto' :
                                       med.target_audience === 'pregnant' ? 'Wajawazito' : 'Wazee'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={med.in_stock} onCheckedChange={() => toggleStock(med.id, med.in_stock)} />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteMedicine(med.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna dawa - bofya "Ongeza Dawa"</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Taarifa za Famasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Simu</p>
                  <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {pharmacy.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {pharmacy.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fax</p>
                  <p>{(pharmacy as any).fax || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">P.O. Box</p>
                  <p>{(pharmacy as any).po_box || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Maelezo</p>
                  <p>{pharmacy.description || '-'}</p>
                </div>
              </div>
              {(pharmacy as any).emergency_available && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" /> Huduma 24/7
                </Badge>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video na Maudhui ({contents.length})
                </CardTitle>
                <Dialog open={isAddingContent} onOpenChange={setIsAddingContent}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Ongeza
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ongeza Maudhui</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Kichwa *</Label>
                        <Input value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Aina</Label>
                        <Select value={contentForm.contentType} onValueChange={(v) => setContentForm({ ...contentForm, contentType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                            <SelectItem value="article">Makala</SelectItem>
                            <SelectItem value="class">Darasa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Link ya Video/Maudhui *</Label>
                        <Input placeholder="https://youtube.com/..." value={contentForm.contentUrl} onChange={(e) => setContentForm({ ...contentForm, contentUrl: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Maelezo</Label>
                        <Textarea value={contentForm.description} onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })} />
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
                    <div key={content.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{content.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {content.content_type} • {content.views_count} views • {content.likes_count} likes
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteContent(content.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna maudhui - ongeza video, tutorials, au makala</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hariri Taarifa za Famasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Jina la Famasi</Label>
              <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Anwani</Label>
              <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Simu</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fax</Label>
                <Input value={profileForm.fax} onChange={(e) => setProfileForm({ ...profileForm, fax: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">P.O. Box</Label>
                <Input value={profileForm.poBox} onChange={(e) => setProfileForm({ ...profileForm, poBox: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Maelezo ya Famasi</Label>
              <Textarea value={profileForm.description} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Quote ya Leo</Label>
              <Input placeholder="Afya ni Utajiri..." value={profileForm.quoteOfDay} onChange={(e) => setProfileForm({ ...profileForm, quoteOfDay: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={profileForm.emergencyAvailable} onCheckedChange={(v) => setProfileForm({ ...profileForm, emergencyAvailable: v })} />
              <Label className="text-xs">Huduma za Dharura 24/7</Label>
            </div>
            <Button onClick={handleUpdateProfile} className="w-full">Hifadhi Mabadiliko</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
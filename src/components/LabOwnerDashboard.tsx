import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  TestTube, Plus, Trash2, Activity, Edit, Building2, Phone, Mail, 
  MapPin, Clock, Upload, Video, Loader2, Globe, AlertCircle, Bell, MessageCircle, Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LogoUpload } from '@/components/LogoUpload';
import OrgStaffManager from '@/components/OrgStaffManager';

export default function LabOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lab, setLab] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [loading, setLoading] = useState(true);

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    waitingHours: '',
    category: '',
    preparationRequired: ''
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    fax: '',
    poBox: '',
    website: '',
    description: '',
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
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch lab profile
      const { data: labData, error: labError } = await supabase
        .from('laboratories')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (labError && labError.code !== 'PGRST116') throw labError;
      setLab(labData);

      if (labData) {
        setProfileForm({
          name: labData.name || '',
          address: labData.address || '',
          phone: labData.phone || '',
          email: labData.email || '',
          fax: (labData as any).fax || '',
          poBox: (labData as any).po_box || '',
          website: (labData as any).website || '',
          description: labData.description || '',
          emergencyAvailable: (labData as any).emergency_available || false
        });

        // Fetch services from laboratory_services table
        const { data: servicesData } = await supabase
          .from('laboratory_services')
          .select('*')
          .eq('laboratory_id', labData.id)
          .order('created_at', { ascending: false });

        setServices(servicesData || []);

        // Fetch bookings
        const { data: bookingsData } = await supabase
          .from('lab_bookings')
          .select('*, patient:profiles!lab_bookings_patient_id_fkey(first_name, last_name, avatar_url, phone)')
          .eq('laboratory_id', labData.id)
          .order('created_at', { ascending: false });

        setBookings(bookingsData || []);

        // Fetch contents
        const { data: contentsData } = await supabase
          .from('institution_content')
          .select('*')
          .eq('institution_type', 'laboratory')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false });

        setContents(contentsData || []);
      }
    } catch (error: any) {
      console.error('Error fetching lab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from('lab_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: `Kipimo kimesasishwa: ${status}` });
      fetchData();
    }
  };

  const handleAddService = async () => {
    if (!lab || !serviceForm.name) {
      toast({ title: 'Kosa', description: 'Jina la huduma linahitajika', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('laboratory_services')
      .insert([{
        laboratory_id: lab.id,
        name: serviceForm.name,
        description: serviceForm.description,
        price: serviceForm.price ? parseFloat(serviceForm.price) : null,
        waiting_hours: serviceForm.waitingHours ? parseInt(serviceForm.waitingHours) : null,
        category: serviceForm.category,
        preparation_required: serviceForm.preparationRequired,
        is_available: true
      }]);

    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Huduma imeongezwa' });
      setServiceForm({ name: '', description: '', price: '', waitingHours: '', category: '', preparationRequired: '' });
      setIsAddingService(false);
      fetchData();
    }
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase.from('laboratory_services').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefutwa' });
      fetchData();
    }
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase
      .from('laboratories')
      .update({
        name: profileForm.name,
        address: profileForm.address,
        phone: profileForm.phone,
        email: profileForm.email,
        fax: profileForm.fax,
        po_box: profileForm.poBox,
        website: profileForm.website,
        description: profileForm.description,
        emergency_available: profileForm.emergencyAvailable
      } as any)
      .eq('id', lab.id);

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
        institution_type: 'laboratory',
        institution_id: lab.id,
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

  const deleteContent = async (id: string) => {
    await supabase.from('institution_content').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="p-4 text-center">
        <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Hakuna Maabara</h2>
        <p className="text-sm text-muted-foreground">Wasiliana na Super Admin kusajili maabara yako</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoUpload
            currentLogoUrl={lab.logo_url}
            entityId={lab.id}
            entityType="laboratory"
            onLogoUpdated={(url) => setLab({ ...lab, logo_url: url })}
          />
          <div>
            <h1 className="text-lg font-bold">{lab.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {lab.address}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditingProfile(true)}>
            <Edit className="h-3 w-3 mr-1" /> Hariri
          </Button>
          <Badge variant={lab.is_verified ? 'default' : 'secondary'}>
            {lab.is_verified ? 'Imethibitishwa' : 'Inasubiri'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-teal-500" />
            <p className="text-xl font-bold">{services.length}</p>
            <p className="text-[10px] text-muted-foreground">Huduma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Video className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{contents.length}</p>
            <p className="text-[10px] text-muted-foreground">Maudhui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{lab.rating || 0} ⭐</div>
            <p className="text-[10px] text-muted-foreground">{lab.total_reviews || 0} reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/notifications')}>
          <Bell className="h-4 w-4" />
          <span className="text-[10px]">Arifa</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/messages')}>
          <MessageCircle className="h-4 w-4" />
          <span className="text-[10px]">Ujumbe</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/appointments')}>
          <Calendar className="h-4 w-4" />
          <span className="text-[10px]">Miadi</span>
        </Button>
      </div>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bookings">Vipimo</TabsTrigger>
          <TabsTrigger value="services">Huduma</TabsTrigger>
          <TabsTrigger value="profile">Taarifa</TabsTrigger>
          <TabsTrigger value="content">Maudhui</TabsTrigger>
          <TabsTrigger value="staff">Wafanyakazi</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Maombi ya Vipimo ({bookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{booking.test_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Mgonjwa: {booking.patient?.first_name} {booking.patient?.last_name}
                            {booking.patient?.phone && ` • ${booking.patient.phone}`}
                          </p>
                          {booking.notes && <p className="text-xs mt-1">Maelezo: {booking.notes}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(booking.created_at).toLocaleDateString('sw-TZ')}
                          </p>
                        </div>
                        <Badge variant={
                          booking.status === 'pending' ? 'secondary' : 
                          booking.status === 'confirmed' ? 'default' :
                          booking.status === 'results_ready' ? 'default' :
                          booking.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {booking.status === 'pending' ? 'Inasubiri' :
                           booking.status === 'confirmed' ? 'Imekubaliwa' :
                           booking.status === 'results_ready' ? 'Matokeo Tayari' :
                           booking.status === 'completed' ? 'Imekamilika' : 'Imeghairiwa'}
                        </Badge>
                      </div>
                      {booking.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => updateBookingStatus(booking.id, 'confirmed')}>
                            Kubali
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                            Kataa
                          </Button>
                        </div>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button size="sm" className="h-7 text-xs w-full mt-2" onClick={() => updateBookingStatus(booking.id, 'results_ready')}>
                          Matokeo Tayari
                        </Button>
                      )}
                      {booking.status === 'results_ready' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full mt-2" onClick={() => updateBookingStatus(booking.id, 'completed')}>
                          Kamilisha
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna maombi mapya ya vipimo</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Huduma za Vipimo ({services.length})
                </CardTitle>
                <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Ongeza Huduma
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Ongeza Huduma ya Kipimo</DialogTitle>
                      <DialogDescription>Weka maelezo kamili ya huduma</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Jina la Kipimo *</Label>
                        <Input 
                          placeholder="mfano: Complete Blood Count (CBC)" 
                          value={serviceForm.name} 
                          onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Aina/Category</Label>
                        <Select value={serviceForm.category} onValueChange={(v) => setServiceForm({ ...serviceForm, category: v })}>
                          <SelectTrigger><SelectValue placeholder="Chagua aina" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blood">Damu</SelectItem>
                            <SelectItem value="urine">Mkojo</SelectItem>
                            <SelectItem value="stool">Kinyesi</SelectItem>
                            <SelectItem value="imaging">Picha (X-ray, Ultrasound)</SelectItem>
                            <SelectItem value="genetic">Vinasaba</SelectItem>
                            <SelectItem value="other">Nyinginezo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Bei (TZS)</Label>
                          <Input 
                            type="number" 
                            placeholder="15000" 
                            value={serviceForm.price} 
                            onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Masaa ya Kusubiri</Label>
                          <Input 
                            type="number" 
                            placeholder="24" 
                            value={serviceForm.waitingHours} 
                            onChange={(e) => setServiceForm({ ...serviceForm, waitingHours: e.target.value })} 
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Maandalizi Yanayohitajika</Label>
                        <Textarea 
                          placeholder="mfano: Usile chakula masaa 8 kabla ya kipimo..." 
                          value={serviceForm.preparationRequired} 
                          onChange={(e) => setServiceForm({ ...serviceForm, preparationRequired: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Maelezo Mengine</Label>
                        <Textarea 
                          placeholder="Maelezo ya ziada kuhusu kipimo..." 
                          value={serviceForm.description} 
                          onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} 
                        />
                      </div>
                      <Button onClick={handleAddService} className="w-full">Ongeza Huduma</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{service.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {service.category && <Badge variant="outline" className="text-[9px]">{service.category}</Badge>}
                            {service.price && <span>{service.price} TZS</span>}
                            {service.waiting_hours && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {service.waiting_hours} masaa
                              </span>
                            )}
                          </div>
                          {service.preparation_required && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              {service.preparation_required}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna huduma - bofya "Ongeza Huduma"</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Taarifa za Maabara
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Simu</p>
                  <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lab.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lab.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fax</p>
                  <p>{(lab as any).fax || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">P.O. Box</p>
                  <p>{(lab as any).po_box || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="flex items-center gap-1"><Globe className="h-3 w-3" /> {(lab as any).website || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Huduma 24/7</p>
                  <p>{(lab as any).emergency_available ? '✅ Ndiyo' : '❌ Hapana'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Maelezo</p>
                  <p>{lab.description || '-'}</p>
                </div>
              </div>
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
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna maudhui</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="staff" className="space-y-4">
          <Card><CardContent className="p-3"><OrgStaffManager orgType="laboratory" orgId={lab.id} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hariri Taarifa za Maabara</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Jina la Maabara</Label>
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
              <Label className="text-xs">Website</Label>
              <Input placeholder="https://..." value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Maelezo ya Maabara</Label>
              <Textarea value={profileForm.description} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} />
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
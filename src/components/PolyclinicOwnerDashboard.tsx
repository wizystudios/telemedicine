import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, Plus, Loader2, Stethoscope, 
  TrendingUp, MapPin, Phone, Mail, Clock, Trash2,
  FileText, Settings, Video
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { LogoUpload } from '@/components/LogoUpload';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { ContentUploadSection } from '@/components/ContentUploadSection';
import { DoctorImageUpload } from '@/components/DoctorImageUpload';

const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

export default function PolyclinicOwnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [polyclinic, setPolyclinic] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [stats, setStats] = useState({ doctors: 0, appointments: 0, services: 0 });
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);

  const [newDoctor, setNewDoctor] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    licenseNumber: '', bio: '', experienceYears: '', consultationFee: '', specialtyId: '', doctorType: ''
  });

  const [newTimetable, setNewTimetable] = useState({
    dayOfWeek: '1', startTime: '08:00', endTime: '17:00', location: ''
  });

  const [newService, setNewService] = useState({
    name: '', description: '', price: '', category: '', isAvailable: true
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
      fetchSpecialties();
    }
  }, [user?.id]);

  const fetchSpecialties = async () => {
    const { data } = await supabase.from('specialties').select('*').order('name');
    setSpecialties(data || []);
  };

  const fetchData = async () => {
    try {
      const { data: polyclinicData } = await supabase
        .from('polyclinics')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (!polyclinicData) {
        setLoading(false);
        return;
      }

      setPolyclinic(polyclinicData);

      // Fetch doctors
      const { data: doctorsData } = await supabase
        .from('doctor_profiles')
        .select('*, profiles!doctor_profiles_user_id_fkey(first_name, last_name, email, avatar_url, phone), specialties(name)')
        .eq('polyclinic_id', polyclinicData.id);

      setDoctors(doctorsData || []);

      // Fetch services
      const { data: servicesData } = await supabase
        .from('polyclinic_services')
        .select('*')
        .eq('polyclinic_id', polyclinicData.id)
        .order('created_at', { ascending: false });
      
      setServices(servicesData || []);

      // Stats
      const doctorIds = doctorsData?.map(d => d.user_id) || [];
      let monthlyAppts = 0;
      
      if (doctorIds.length > 0) {
        const thisMonth = new Date().toISOString().slice(0, 7);
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('doctor_id', doctorIds)
          .gte('appointment_date', thisMonth + '-01');
        monthlyAppts = count || 0;
      }

      setStats({ 
        doctors: doctorsData?.length || 0, 
        appointments: monthlyAppts, 
        services: servicesData?.length || 0
      });

      // Chart data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setChartData(months.map(name => ({ name, value: Math.floor(Math.random() * 20) + 3 })));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!newDoctor.email || !newDoctor.firstName || !newDoctor.password || !newDoctor.licenseNumber) {
      toast({ title: 'Kosa', description: 'Jaza taarifa zote zinazohitajika', variant: 'destructive' });
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDoctor.email,
        password: newDoctor.password,
        options: {
          data: {
            first_name: newDoctor.firstName,
            last_name: newDoctor.lastName,
            phone: newDoctor.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Imeshindwa kuunda akaunti');

      await supabase.from('user_roles').insert([{ user_id: authData.user.id, role: 'doctor' as any }]);

      const { error: profileError } = await supabase.from('doctor_profiles').insert([{
        user_id: authData.user.id,
        polyclinic_id: polyclinic.id,
        polyclinic_name: polyclinic.name,
        license_number: newDoctor.licenseNumber,
        bio: newDoctor.bio,
        experience_years: newDoctor.experienceYears ? parseInt(newDoctor.experienceYears) : 0,
        consultation_fee: newDoctor.consultationFee ? parseFloat(newDoctor.consultationFee) : 0,
        specialty_id: newDoctor.specialtyId || null,
        doctor_type: newDoctor.doctorType || null,
        is_private: false,
        is_verified: true,
      }]);

      if (profileError) throw profileError;

      toast({ title: 'Imefanikiwa!', description: `Daktari ${newDoctor.firstName} ameongezwa` });
      setIsAddingDoctor(false);
      setNewDoctor({ email: '', password: '', firstName: '', lastName: '', phone: '', licenseNumber: '', bio: '', experienceYears: '', consultationFee: '', specialtyId: '', doctorType: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    }
  };

  const openTimetable = async (doctor: any) => {
    setSelectedDoctor(doctor);
    const { data } = await supabase
      .from('doctor_timetable')
      .select('*')
      .eq('doctor_id', doctor.user_id)
      .order('day_of_week');
    setTimetable(data || []);
    setIsTimetableOpen(true);
  };

  const addTimetableEntry = async () => {
    if (!selectedDoctor) return;

    const { error } = await supabase.from('doctor_timetable').insert([{
      doctor_id: selectedDoctor.user_id,
      day_of_week: parseInt(newTimetable.dayOfWeek),
      start_time: newTimetable.startTime,
      end_time: newTimetable.endTime,
      location: newTimetable.location || polyclinic.name,
      is_available: true
    }]);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Ratiba imeongezwa' });
      openTimetable(selectedDoctor);
    }
  };

  const deleteTimetableEntry = async (id: string) => {
    const { error } = await supabase.from('doctor_timetable').delete().eq('id', id);
    if (!error && selectedDoctor) openTimetable(selectedDoctor);
  };

  const removeDoctor = async (doctorId: string) => {
    const { error } = await supabase
      .from('doctor_profiles')
      .update({ polyclinic_id: null, polyclinic_name: null })
      .eq('id', doctorId);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Daktari ameondolewa' });
      fetchData();
    }
  };

  const handleAddService = async () => {
    if (!newService.name) {
      toast({ title: 'Kosa', description: 'Jina la huduma linahitajika', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('polyclinic_services').insert([{
      polyclinic_id: polyclinic.id,
      name: newService.name,
      description: newService.description,
      price: newService.price ? parseFloat(newService.price) : null,
      category: newService.category,
      is_available: newService.isAvailable,
    }]);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Huduma imeongezwa' });
      setIsAddingService(false);
      setNewService({ name: '', description: '', price: '', category: '', isAvailable: true });
      fetchData();
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from('polyclinic_services').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Imefanikiwa', description: 'Huduma imefutwa' });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!polyclinic) {
    return (
      <div className="p-4 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Hakuna Polyclinic</h2>
        <p className="text-sm text-muted-foreground">Wasiliana na Super Admin kusajili polyclinic yako</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoUpload
            currentLogoUrl={polyclinic.logo_url}
            entityId={polyclinic.id}
            entityType="polyclinic"
            onLogoUpdated={(url) => setPolyclinic({ ...polyclinic, logo_url: url })}
          />
          <div>
            <h1 className="text-lg font-bold">{polyclinic.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {polyclinic.address}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Badge variant={polyclinic.is_verified ? 'default' : 'secondary'} className="text-[10px]">
            {polyclinic.is_verified ? 'Imethibitishwa' : 'Inasubiri'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <Stethoscope className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{stats.doctors}</p>
            <p className="text-[10px] text-muted-foreground">Madaktari</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{stats.services}</p>
            <p className="text-[10px] text-muted-foreground">Huduma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{polyclinic.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-[10px] text-muted-foreground">Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Muhtasari</TabsTrigger>
          <TabsTrigger value="doctors" className="text-xs">Madaktari</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Huduma</TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Maudhui</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Miadi kwa Mwezi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <h3 className="text-sm font-semibold mb-2">Mawasiliano</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                {polyclinic.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{polyclinic.phone}</p>}
                {polyclinic.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{polyclinic.email}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Madaktari ({doctors.length})
                </CardTitle>
                <Dialog open={isAddingDoctor} onOpenChange={setIsAddingDoctor}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Ongeza Daktari
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Ongeza Daktari Mpya</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Jina la Kwanza *</Label>
                          <Input value={newDoctor.firstName} onChange={(e) => setNewDoctor({...newDoctor, firstName: e.target.value})} />
                        </div>
                        <div>
                          <Label className="text-xs">Jina la Ukoo *</Label>
                          <Input value={newDoctor.lastName} onChange={(e) => setNewDoctor({...newDoctor, lastName: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Email *</Label>
                        <Input type="email" value={newDoctor.email} onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})} />
                      </div>
                      <div>
                        <Label className="text-xs">Password *</Label>
                        <Input type="password" value={newDoctor.password} onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})} />
                      </div>
                      <div>
                        <Label className="text-xs">Simu</Label>
                        <Input value={newDoctor.phone} onChange={(e) => setNewDoctor({...newDoctor, phone: e.target.value})} />
                      </div>
                      <div>
                        <Label className="text-xs">License Number *</Label>
                        <Input value={newDoctor.licenseNumber} onChange={(e) => setNewDoctor({...newDoctor, licenseNumber: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Miaka ya Uzoefu</Label>
                          <Input type="number" value={newDoctor.experienceYears} onChange={(e) => setNewDoctor({...newDoctor, experienceYears: e.target.value})} />
                        </div>
                        <div>
                          <Label className="text-xs">Ada (TZS)</Label>
                          <Input type="number" value={newDoctor.consultationFee} onChange={(e) => setNewDoctor({...newDoctor, consultationFee: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Utaalamu (Specialty) *</Label>
                        <Select value={newDoctor.specialtyId} onValueChange={(v) => setNewDoctor({...newDoctor, specialtyId: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chagua utaalamu..." />
                          </SelectTrigger>
                          <SelectContent>
                            {specialties.map((spec) => (
                              <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Aina ya Daktari</Label>
                        <Select value={newDoctor.doctorType} onValueChange={(v) => setNewDoctor({...newDoctor, doctorType: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chagua aina..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Practitioner">Daktari wa Jumla</SelectItem>
                            <SelectItem value="Specialist">Mtaalamu</SelectItem>
                            <SelectItem value="Consultant">Mshauri</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Bio</Label>
                        <Textarea value={newDoctor.bio} onChange={(e) => setNewDoctor({...newDoctor, bio: e.target.value})} />
                      </div>
                      <Button onClick={handleAddDoctor} className="w-full">Ongeza Daktari</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {doctors.length > 0 ? (
                <div className="space-y-3">
                  {doctors.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                      <DoctorImageUpload
                        currentImageUrl={doc.profiles?.avatar_url}
                        doctorId={doc.user_id}
                        doctorName={`${doc.profiles?.first_name || ''} ${doc.profiles?.last_name || ''}`}
                        onImageUpdate={(url) => {
                          setDoctors(prev => prev.map(d => 
                            d.id === doc.id 
                              ? { ...d, profiles: { ...d.profiles, avatar_url: url } }
                              : d
                          ));
                        }}
                        size="md"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}
                        </p>
                        <p className="text-xs text-primary">{doc.specialties?.name || doc.doctor_type || 'Daktari wa Jumla'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={doc.is_available ? 'default' : 'secondary'} className="text-[10px]">
                            {doc.is_available ? 'Anapatikana' : 'Hapatikani'}
                          </Badge>
                          {doc.consultation_fee && (
                            <span className="text-[10px] text-muted-foreground">
                              TSh {doc.consultation_fee.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => openTimetable(doc)}>
                          <Clock className="h-3 w-3 mr-1" /> Ratiba
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-destructive" onClick={() => removeDoctor(doc.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Ondoa
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna madaktari</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Huduma ({services.length})
                </CardTitle>
                <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Ongeza Huduma
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Ongeza Huduma Mpya</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Jina la Huduma *</Label>
                        <Input value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} />
                      </div>
                      <div>
                        <Label className="text-xs">Maelezo</Label>
                        <Textarea value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Bei (TZS)</Label>
                          <Input type="number" value={newService.price} onChange={(e) => setNewService({...newService, price: e.target.value})} />
                        </div>
                        <div>
                          <Label className="text-xs">Kategoria</Label>
                          <Select value={newService.category} onValueChange={(v) => setNewService({...newService, category: v})}>
                            <SelectTrigger><SelectValue placeholder="Chagua..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">Jumla</SelectItem>
                              <SelectItem value="specialist">Mtaalamu</SelectItem>
                              <SelectItem value="diagnostic">Uchunguzi</SelectItem>
                              <SelectItem value="preventive">Kuzuia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                    <div key={service.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{service.name}</p>
                        {service.description && <p className="text-xs text-muted-foreground">{service.description}</p>}
                        {service.price && <p className="text-xs text-primary font-medium">TSh {service.price.toLocaleString()}</p>}
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteService(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna huduma</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <ContentUploadSection 
            institutionType="polyclinic" 
            institutionId={polyclinic?.id}
          />
        </TabsContent>
      </Tabs>

      {/* Timetable Dialog */}
      <Dialog open={isTimetableOpen} onOpenChange={setIsTimetableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ratiba - Dr. {selectedDoctor?.profiles?.first_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {timetable.length > 0 && (
              <div className="space-y-2">
                {timetable.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{DAYS[entry.day_of_week]}: {entry.start_time?.slice(0,5)} - {entry.end_time?.slice(0,5)}</span>
                    <Button size="sm" variant="ghost" onClick={() => deleteTimetableEntry(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Ongeza Siku</h4>
              <div className="grid grid-cols-2 gap-2">
                <Select value={newTimetable.dayOfWeek} onValueChange={(v) => setNewTimetable({...newTimetable, dayOfWeek: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Mahali" value={newTimetable.location} onChange={(e) => setNewTimetable({...newTimetable, location: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={newTimetable.startTime} onChange={(e) => setNewTimetable({...newTimetable, startTime: e.target.value})} />
                <Input type="time" value={newTimetable.endTime} onChange={(e) => setNewTimetable({...newTimetable, endTime: e.target.value})} />
              </div>
              <Button onClick={addTimetableEntry} className="w-full" size="sm">Ongeza</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SettingsDrawer open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

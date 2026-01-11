import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, Calendar, Plus, Loader2, Stethoscope, 
  TrendingUp, MapPin, Phone, Mail, Clock, Trash2, Ambulance,
  FileText, Edit, DollarSign, Settings, Video
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { LogoUpload } from '@/components/LogoUpload';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { ContentUploadSection } from '@/components/ContentUploadSection';
import { DoctorImageUpload } from '@/components/DoctorImageUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

export default function HospitalOwnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [stats, setStats] = useState({ doctors: 0, appointments: 0, thisMonth: 0, services: 0 });
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [contents, setContents] = useState<any[]>([]);

  // New doctor form
  const [newDoctor, setNewDoctor] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    licenseNumber: '', bio: '', experienceYears: '', consultationFee: '', specialtyId: '', doctorType: ''
  });
  const [specialties, setSpecialties] = useState<any[]>([]);

  // Timetable form
  const [newTimetable, setNewTimetable] = useState({
    dayOfWeek: '1', startTime: '08:00', endTime: '17:00', location: ''
  });

  // New service form
  const [newService, setNewService] = useState({
    name: '', description: '', price: '', category: '', isAvailable: true, 
    ambulanceAvailable: false, ambulancePhone: ''
  });

  // Ambulance settings
  const [ambulanceSettings, setAmbulanceSettings] = useState({
    hasAmbulance: false, ambulancePhone: '', ambulanceAvailable24h: false
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
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (!hospitalData) {
        setLoading(false);
        return;
      }

      setHospital(hospitalData);
      
      // Set ambulance settings from hospital data
      setAmbulanceSettings({
        hasAmbulance: hospitalData.has_ambulance || false,
        ambulancePhone: hospitalData.ambulance_phone || '',
        ambulanceAvailable24h: hospitalData.ambulance_available_24h || false
      });

      // Fetch doctors
      const { data: doctorsData } = await supabase
        .from('doctor_profiles')
        .select('*, profiles!doctor_profiles_user_id_fkey(first_name, last_name, email, avatar_url, phone)')
        .eq('hospital_id', hospitalData.id);

      setDoctors(doctorsData || []);

      // Fetch services
      const { data: servicesData } = await supabase
        .from('hospital_services')
        .select('*')
        .eq('hospital_id', hospitalData.id)
        .order('created_at', { ascending: false });
      
      setServices(servicesData || []);

      // Stats
      const doctorIds = doctorsData?.map(d => d.user_id) || [];
      const thisMonth = new Date().toISOString().slice(0, 7);
      let monthlyAppts = 0;
      
      if (doctorIds.length > 0) {
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
        thisMonth: monthlyAppts,
        services: servicesData?.length || 0
      });

      // Chart data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setChartData(months.map(name => ({ name, value: Math.floor(Math.random() * 30) + 5 })));

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
      // 1. Create auth account for doctor
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDoctor.email,
        password: newDoctor.password,
        options: {
          data: {
            first_name: newDoctor.firstName,
            last_name: newDoctor.lastName,
            phone: newDoctor.phone,
            role: 'doctor', // Set role in auth metadata
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Imeshindwa kuunda akaunti');

      // 2. Assign doctor role in user_roles table
      await supabase.from('user_roles').insert([{ user_id: authData.user.id, role: 'doctor' as any }]);

      // 3. Update profiles table to set role as doctor
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ role: 'doctor' })
        .eq('id', authData.user.id);

      if (profileUpdateError) console.error('Profile role update error:', profileUpdateError);

      // 4. Create doctor profile linked to this hospital
      const { error: profileError } = await supabase.from('doctor_profiles').insert([{
        user_id: authData.user.id,
        hospital_id: hospital.id,
        hospital_name: hospital.name,
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
      console.error(error);
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    }
  };

  const openTimetable = async (doctor: any) => {
    setSelectedDoctor(doctor);
    
    // Fetch doctor's timetable
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
      location: newTimetable.location || hospital.name,
      is_available: true
    }]);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Ratiba imeongezwa' });
      openTimetable(selectedDoctor); // Refresh
    }
  };

  const deleteTimetableEntry = async (id: string) => {
    const { error } = await supabase.from('doctor_timetable').delete().eq('id', id);
    if (!error && selectedDoctor) {
      openTimetable(selectedDoctor);
    }
  };

  const removeDoctor = async (doctorId: string) => {
    const { error } = await supabase
      .from('doctor_profiles')
      .update({ hospital_id: null, hospital_name: null })
      .eq('id', doctorId);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Daktari ameondolewa' });
      fetchData();
    }
  };

  // Service management
  const handleAddService = async () => {
    if (!newService.name) {
      toast({ title: 'Kosa', description: 'Jina la huduma linahitajika', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('hospital_services').insert([{
      hospital_id: hospital.id,
      name: newService.name,
      description: newService.description,
      price: newService.price ? parseFloat(newService.price) : null,
      category: newService.category,
      is_available: newService.isAvailable,
      ambulance_available: newService.ambulanceAvailable,
      ambulance_phone: newService.ambulancePhone
    }]);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Huduma imeongezwa' });
      setIsAddingService(false);
      setNewService({ name: '', description: '', price: '', category: '', isAvailable: true, ambulanceAvailable: false, ambulancePhone: '' });
      fetchData();
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    const { error } = await supabase.from('hospital_services')
      .update({
        name: editingService.name,
        description: editingService.description,
        price: editingService.price,
        category: editingService.category,
        is_available: editingService.is_available
      })
      .eq('id', editingService.id);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Huduma imesasishwa' });
      setEditingService(null);
      fetchData();
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from('hospital_services').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Imefanikiwa', description: 'Huduma imefutwa' });
      fetchData();
    }
  };

  // Ambulance settings
  const saveAmbulanceSettings = async () => {
    const { error } = await supabase.from('hospitals')
      .update({
        has_ambulance: ambulanceSettings.hasAmbulance,
        ambulance_phone: ambulanceSettings.ambulancePhone,
        ambulance_available_24h: ambulanceSettings.ambulanceAvailable24h
      })
      .eq('id', hospital.id);

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Mipangilio ya Ambulance imehifadhiwa' });
      setHospital({ 
        ...hospital, 
        has_ambulance: ambulanceSettings.hasAmbulance,
        ambulance_phone: ambulanceSettings.ambulancePhone,
        ambulance_available_24h: ambulanceSettings.ambulanceAvailable24h
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="p-4 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Hakuna Hospitali</h2>
        <p className="text-sm text-muted-foreground">Wasiliana na Super Admin kusajili hospitali yako</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoUpload
            currentLogoUrl={hospital.logo_url}
            entityId={hospital.id}
            entityType="hospital"
            onLogoUpdated={(url) => setHospital({ ...hospital, logo_url: url })}
          />
          <div>
            <h1 className="text-lg font-bold">{hospital.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {hospital.address}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Badge variant={hospital.is_verified ? 'default' : 'secondary'} className="text-[10px]">
            {hospital.is_verified ? 'Imethibitishwa' : 'Inasubiri'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
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
            <Calendar className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-xl font-bold">{stats.thisMonth}</p>
            <p className="text-[10px] text-muted-foreground">Miadi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{hospital.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-[10px] text-muted-foreground">Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">Muhtasari</TabsTrigger>
          <TabsTrigger value="doctors" className="text-xs">Madaktari</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Huduma</TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Maudhui</TabsTrigger>
          <TabsTrigger value="ambulance" className="text-xs">Ambulance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Chart */}
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

          {/* Contact */}
          <Card>
            <CardContent className="p-3">
              <h3 className="text-sm font-semibold mb-2">Mawasiliano</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                {hospital.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{hospital.phone}</p>}
                {hospital.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{hospital.email}</p>}
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
                        <Label className="text-xs">Bio / Utaalamu</Label>
                        <Textarea value={newDoctor.bio} onChange={(e) => setNewDoctor({...newDoctor, bio: e.target.value})} />
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
                            <SelectItem value="Surgeon">Daktari wa Upasuaji</SelectItem>
                            <SelectItem value="Consultant">Mshauri</SelectItem>
                            <SelectItem value="Resident">Daktari Mkazi</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <p className="text-xs text-muted-foreground truncate">{doc.profiles?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={doc.is_available ? 'default' : 'secondary'} className="text-[10px]">
                            {doc.is_available ? 'Anapatikana' : 'Hapatikani'}
                          </Badge>
                          {doc.consultation_fee && (
                            <span className="text-[10px] text-primary font-medium">
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
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna madaktari - bofya "Ongeza Daktari" kuongeza</p>
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
                              <SelectItem value="surgery">Upasuaji</SelectItem>
                              <SelectItem value="maternity">Uzazi</SelectItem>
                              <SelectItem value="pediatric">Watoto</SelectItem>
                              <SelectItem value="emergency">Dharura</SelectItem>
                              <SelectItem value="lab">Maabara</SelectItem>
                              <SelectItem value="imaging">Picha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={newService.isAvailable} onCheckedChange={(c) => setNewService({...newService, isAvailable: c})} />
                        <Label className="text-xs">Inapatikana</Label>
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
                  {services.map((service: any) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{service.name}</p>
                          {service.category && <Badge variant="outline" className="text-[10px]">{service.category}</Badge>}
                          {!service.is_available && <Badge variant="destructive" className="text-[10px]">Haipo</Badge>}
                        </div>
                        {service.description && <p className="text-xs text-muted-foreground mt-1">{service.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {service.price && <p className="text-sm font-medium text-primary">Tsh {Number(service.price).toLocaleString()}</p>}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingService(service)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteService(service.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna huduma - bofya "Ongeza Huduma" kuongeza</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ambulance Tab */}
        <TabsContent value="ambulance" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ambulance className="h-4 w-4 text-red-500" />
                Mipangilio ya Ambulance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Ambulance className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Huduma ya Ambulance</p>
                    <p className="text-xs text-muted-foreground">Washa huduma ya ambulance kwa wagonjwa</p>
                  </div>
                </div>
                <Switch 
                  checked={ambulanceSettings.hasAmbulance} 
                  onCheckedChange={(c) => setAmbulanceSettings({...ambulanceSettings, hasAmbulance: c})} 
                />
              </div>

              {ambulanceSettings.hasAmbulance && (
                <>
                  <div>
                    <Label className="text-xs">Nambari ya Simu ya Ambulance</Label>
                    <Input 
                      value={ambulanceSettings.ambulancePhone} 
                      onChange={(e) => setAmbulanceSettings({...ambulanceSettings, ambulancePhone: e.target.value})}
                      placeholder="+255 xxx xxx xxx"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Inapatikana 24/7</p>
                      <p className="text-xs text-muted-foreground">Ambulance inapatikana masaa 24</p>
                    </div>
                    <Switch 
                      checked={ambulanceSettings.ambulanceAvailable24h} 
                      onCheckedChange={(c) => setAmbulanceSettings({...ambulanceSettings, ambulanceAvailable24h: c})} 
                    />
                  </div>
                </>
              )}

              <Button onClick={saveAmbulanceSettings} className="w-full">
                Hifadhi Mipangilio
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Timetable Dialog */}
      <Dialog open={isTimetableOpen} onOpenChange={setIsTimetableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ratiba ya Dr. {selectedDoctor?.profiles?.first_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {timetable.length > 0 && (
              <div className="space-y-2">
                {timetable.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{DAYS[entry.day_of_week]}</p>
                      <p className="text-xs text-muted-foreground">{entry.start_time} - {entry.end_time}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteTimetableEntry(entry.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Ongeza Ratiba Mpya</p>
              <div>
                <Label className="text-xs">Siku</Label>
                <Select value={newTimetable.dayOfWeek} onValueChange={(v) => setNewTimetable({...newTimetable, dayOfWeek: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Kuanzia</Label>
                  <Input type="time" value={newTimetable.startTime} onChange={(e) => setNewTimetable({...newTimetable, startTime: e.target.value})} />
                </div>
                <div>
                  <Label className="text-xs">Hadi</Label>
                  <Input type="time" value={newTimetable.endTime} onChange={(e) => setNewTimetable({...newTimetable, endTime: e.target.value})} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Mahali (Hiari)</Label>
                <Input value={newTimetable.location} onChange={(e) => setNewTimetable({...newTimetable, location: e.target.value})} placeholder={hospital.name} />
              </div>
              <Button onClick={addTimetableEntry} className="w-full">Ongeza Ratiba</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hariri Huduma</DialogTitle>
          </DialogHeader>
          {editingService && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Jina la Huduma</Label>
                <Input value={editingService.name} onChange={(e) => setEditingService({...editingService, name: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Maelezo</Label>
                <Textarea value={editingService.description || ''} onChange={(e) => setEditingService({...editingService, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Bei (TZS)</Label>
                  <Input type="number" value={editingService.price || ''} onChange={(e) => setEditingService({...editingService, price: e.target.value})} />
                </div>
                <div>
                  <Label className="text-xs">Kategoria</Label>
                  <Select value={editingService.category || ''} onValueChange={(v) => setEditingService({...editingService, category: v})}>
                    <SelectTrigger><SelectValue placeholder="Chagua..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Jumla</SelectItem>
                      <SelectItem value="surgery">Upasuaji</SelectItem>
                      <SelectItem value="maternity">Uzazi</SelectItem>
                      <SelectItem value="pediatric">Watoto</SelectItem>
                      <SelectItem value="emergency">Dharura</SelectItem>
                      <SelectItem value="lab">Maabara</SelectItem>
                      <SelectItem value="imaging">Picha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingService.is_available} onCheckedChange={(c) => setEditingService({...editingService, is_available: c})} />
                <Label className="text-xs">Inapatikana</Label>
              </div>
              <Button onClick={handleUpdateService} className="w-full">Hifadhi Mabadiliko</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Drawer */}
      <SettingsDrawer 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        userRole="hospital_owner" 
      />
    </div>
  );
}

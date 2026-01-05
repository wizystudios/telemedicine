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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Users, Calendar, Plus, Loader2, Stethoscope, 
  TrendingUp, MapPin, Phone, Mail, Clock, Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { LogoUpload } from '@/components/LogoUpload';

const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

export default function HospitalOwnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ doctors: 0, appointments: 0, thisMonth: 0 });
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // New doctor form
  const [newDoctor, setNewDoctor] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    licenseNumber: '', bio: '', experienceYears: '', consultationFee: ''
  });

  // Timetable form
  const [newTimetable, setNewTimetable] = useState({
    dayOfWeek: '1', startTime: '08:00', endTime: '17:00', location: ''
  });

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

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

      // Fetch doctors
      const { data: doctorsData } = await supabase
        .from('doctor_profiles')
        .select('*, profiles!doctor_profiles_user_id_fkey(first_name, last_name, email, avatar_url, phone)')
        .eq('hospital_id', hospitalData.id);

      setDoctors(doctorsData || []);

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

      setStats({ doctors: doctorsData?.length || 0, appointments: monthlyAppts, thisMonth: monthlyAppts });

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
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Imeshindwa kuunda akaunti');

      // 2. Assign doctor role
      await supabase.from('user_roles').insert([{ user_id: authData.user.id, role: 'doctor' as any }]);

      // 3. Create doctor profile linked to this hospital
      const { error: profileError } = await supabase.from('doctor_profiles').insert([{
        user_id: authData.user.id,
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        license_number: newDoctor.licenseNumber,
        bio: newDoctor.bio,
        experience_years: newDoctor.experienceYears ? parseInt(newDoctor.experienceYears) : 0,
        consultation_fee: newDoctor.consultationFee ? parseFloat(newDoctor.consultationFee) : 0,
        is_private: false,
        is_verified: true, // Auto-verified since hospital owner adding
      }]);

      if (profileError) throw profileError;

      toast({ title: 'Imefanikiwa!', description: `Daktari ${newDoctor.firstName} ameongezwa` });
      setIsAddingDoctor(false);
      setNewDoctor({ email: '', password: '', firstName: '', lastName: '', phone: '', licenseNumber: '', bio: '', experienceYears: '', consultationFee: '' });
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
        <Badge variant={hospital.is_verified ? 'default' : 'secondary'} className="text-[10px]">
          {hospital.is_verified ? 'Imethibitishwa' : 'Inasubiri'}
        </Badge>
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
            <Calendar className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{stats.thisMonth}</p>
            <p className="text-[10px] text-muted-foreground">Mwezi Huu</p>
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

      {/* Doctors */}
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
                  <Button onClick={handleAddDoctor} className="w-full">Ongeza Daktari</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {doctors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Jina</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Hali</TableHead>
                  <TableHead className="text-xs">Vitendo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-xs font-medium">
                      Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{doc.profiles?.email}</TableCell>
                    <TableCell>
                      <Badge variant={doc.is_available ? 'default' : 'secondary'} className="text-[10px]">
                        {doc.is_available ? 'Anapatikana' : 'Hapatikani'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => openTimetable(doc)}>
                          <Clock className="h-3 w-3 mr-1" /> Ratiba
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => removeDoctor(doc.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-4">Hakuna madaktari - bofya "Ongeza Daktari" kuongeza</p>
          )}
        </CardContent>
      </Card>

      {/* Timetable Dialog */}
      <Dialog open={isTimetableOpen} onOpenChange={setIsTimetableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ratiba ya Dr. {selectedDoctor?.profiles?.first_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing timetable */}
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

            {/* Add new entry */}
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
    </div>
  );
}

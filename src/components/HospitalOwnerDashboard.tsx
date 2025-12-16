import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, Users, Calendar, Plus, Loader2, Stethoscope, 
  TrendingUp, MapPin, Phone, Mail
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function HospitalOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ doctors: 0, appointments: 0, thisMonth: 0 });
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ email: '', name: '', specialty: '' });
  const [chartData, setChartData] = useState<any[]>([]);

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
        .select('*, profiles!doctor_profiles_user_id_fkey(first_name, last_name, email, avatar_url)')
        .eq('hospital_id', hospitalData.id);

      setDoctors(doctorsData || []);

      // Fetch appointments for this hospital's doctors
      const doctorIds = doctorsData?.map(d => d.user_id) || [];
      
      // Stats
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
        thisMonth: monthlyAppts
      });

      // Generate chart data (simulated monthly data)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setChartData(months.map(name => ({ name, value: Math.floor(Math.random() * 30) + 5 })));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!newDoctor.email || !newDoctor.name) {
      toast({ title: 'Kosa', description: 'Jaza taarifa zote', variant: 'destructive' });
      return;
    }
    toast({ 
      title: 'Taarifa', 
      description: 'Wasiliana na Super Admin kuongeza daktari mpya',
    });
    setIsAddingDoctor(false);
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
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
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

      {/* Analytics Chart */}
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
                  Ongeza
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ongeza Daktari</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input 
                    placeholder="Jina kamili" 
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  />
                  <Input 
                    type="email" 
                    placeholder="Email" 
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  />
                  <Input 
                    placeholder="Utaalamu" 
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  />
                  <Button onClick={handleAddDoctor} className="w-full">Ongeza</Button>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-4">Hakuna madaktari</p>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-sm font-semibold mb-2">Mawasiliano</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            {hospital.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {hospital.phone}
              </p>
            )}
            {hospital.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {hospital.email}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

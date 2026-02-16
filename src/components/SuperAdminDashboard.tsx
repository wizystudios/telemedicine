import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Shield, Users, Building, Pill, TestTube, Activity, Trash2,
  Eye, RefreshCw, Star, Phone, MapPin, Clock, CheckCircle2,
  Stethoscope, CalendarCheck, UserPlus, Building2, Mail, Globe,
  Award, TrendingUp, Hash,
} from 'lucide-react';
import RegisterOrganizationForm from '@/components/super-admin/RegisterOrganizationForm';
import RegisterDoctorForm from '@/components/super-admin/RegisterDoctorForm';
import RegisterUserForm from '@/components/super-admin/RegisterUserForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AppRole = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner' | 'admin' | 'super_admin' | 'polyclinic_owner';

const TABLES = [
  { name: 'profiles', label: 'Watumiaji', icon: Users },
  { name: 'doctor_profiles', label: 'Madaktari', icon: Stethoscope },
  { name: 'hospitals', label: 'Hospitali', icon: Building },
  { name: 'polyclinics', label: 'Polyclinic', icon: Building2 },
  { name: 'pharmacies', label: 'Famasi', icon: Pill },
  { name: 'laboratories', label: 'Maabara', icon: TestTube },
  { name: 'appointments', label: 'Miadi', icon: CalendarCheck },
  { name: 'specialties', label: 'Utaalamu', icon: Activity },
] as const;

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0, totalDoctors: 0, totalHospitals: 0, totalPolyclinics: 0,
    totalPharmacies: 0, totalLabs: 0, totalAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTable, setActiveTable] = useState('profiles');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [viewingRow, setViewingRow] = useState<any>(null);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTableData(activeTable); }, [activeTable]);

  const fetchStats = async () => {
    try {
      const [
        { count: usersCount }, { count: doctorsCount }, { count: hospitalsCount },
        { count: polyclinicsCount }, { count: pharmaciesCount }, { count: labsCount },
        { count: appointmentsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('doctor_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('hospitals').select('*', { count: 'exact', head: true }),
        supabase.from('polyclinics').select('*', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
        supabase.from('laboratories').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        totalUsers: usersCount || 0, totalDoctors: doctorsCount || 0,
        totalHospitals: hospitalsCount || 0, totalPolyclinics: polyclinicsCount || 0,
        totalPharmacies: pharmaciesCount || 0, totalLabs: labsCount || 0,
        totalAppointments: appointmentsCount || 0,
      });
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchTableData = async (tableName: string) => {
    setTableLoading(true);
    try {
      let query;
      switch (tableName) {
        case 'profiles':
          query = supabase.from('profiles').select('*');
          break;
        case 'doctor_profiles':
          query = supabase.from('doctor_profiles').select('*, profiles:user_id(first_name, last_name, avatar_url, email)');
          break;
        case 'hospitals':
          query = supabase.from('hospitals').select('*');
          break;
        case 'polyclinics':
          query = supabase.from('polyclinics').select('*');
          break;
        case 'pharmacies':
          query = supabase.from('pharmacies').select('*');
          break;
        case 'laboratories':
          query = supabase.from('laboratories').select('*');
          break;
        case 'appointments':
          query = supabase.from('appointments').select('*, patient:patient_id(first_name, last_name), doctor:doctor_id(first_name, last_name)');
          break;
        case 'specialties':
          query = supabase.from('specialties').select('*');
          break;
        default:
          query = supabase.from(tableName as any).select('*');
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setTableData(data || []);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally { setTableLoading(false); }
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta?')) return;
    try {
      const { error } = await supabase.from(activeTable as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Imefanikiwa', description: 'Imefutwa' });
      fetchTableData(activeTable);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    }
  };

  const verifyEntity = async (id: string, tableName: string) => {
    try {
      const { error } = await supabase.from(tableName as any).update({ is_verified: true }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Imeidhinishwa!' });
      fetchTableData(activeTable);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles').select('id').eq('user_id', userId).maybeSingle();
      if (existingRole) {
        await supabase.from('user_roles').update({ role: newRole as AppRole }).eq('user_id', userId);
      } else {
        await supabase.from('user_roles').insert({ user_id: userId, role: newRole as AppRole });
      }
      toast({ title: 'Imefanikiwa', description: `Role imebadilishwa kuwa ${newRole}` });
      fetchTableData(activeTable);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    }
  };

  // ─── Stat cards config ───
  const statCards = [
    { label: 'Watumiaji', value: stats.totalUsers, icon: Users, color: 'bg-primary/10 text-primary' },
    { label: 'Madaktari', value: stats.totalDoctors, icon: Stethoscope, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Hospitali', value: stats.totalHospitals, icon: Building, color: 'bg-violet-500/10 text-violet-500' },
    { label: 'Famasi', value: stats.totalPharmacies, icon: Pill, color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Maabara', value: stats.totalLabs, icon: TestTube, color: 'bg-rose-500/10 text-rose-500' },
    { label: 'Miadi', value: stats.totalAppointments, icon: CalendarCheck, color: 'bg-cyan-500/10 text-cyan-500' },
  ];

  // ─── Card renderers ───
  const renderProfileCard = (row: any) => {
    const role = row.role || 'patient';
    const roleColors: Record<string, string> = {
      super_admin: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
      admin: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
      doctor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      hospital_owner: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      pharmacy_owner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      lab_owner: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
      patient: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
      polyclinic_owner: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    };

    return (
      <Card key={row.id} className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-5">
            <Avatar className="h-14 w-14 ring-2 ring-border/50 shadow-sm">
              <AvatarImage src={row.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-lg">
                {row.first_name?.[0] || row.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {row.first_name || ''} {row.last_name || ''}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{row.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={`text-[11px] capitalize font-medium px-2.5 py-0.5 ${roleColors[role] || ''}`}>
                  {role.replace(/_/g, ' ')}
                </Badge>
                {row.country && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />{row.country}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-border/30 bg-muted/20">
            <Select onValueChange={(value) => changeUserRole(row.id, value)}>
              <SelectTrigger className="flex-1 h-10 border-0 border-r border-border/30 rounded-none text-xs bg-transparent hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="Badili Role" />
              </SelectTrigger>
              <SelectContent>
                {['patient', 'doctor', 'hospital_owner', 'pharmacy_owner', 'lab_owner', 'polyclinic_owner', 'admin', 'super_admin'].map((r) => (
                  <SelectItem key={r} value={r} className="text-xs capitalize">{r.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-primary border-r border-border/30" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDoctorCard = (row: any) => {
    const profile = row.profiles;
    return (
      <Card key={row.id} className="group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-5">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-emerald-500/20 shadow-sm">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-500 font-bold text-lg">
                  {profile?.first_name?.[0] || 'D'}
                </AvatarFallback>
              </Avatar>
              {row.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-card shadow-sm">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                Dr. {profile?.first_name || ''} {profile?.last_name || ''}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{row.hospital_name || row.polyclinic_name || 'Daktari Binafsi'}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" /> {row.experience_years || 0} miaka
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  TZS {row.consultation_fee?.toLocaleString() || 0}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{row.rating || 0}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-border/30 bg-muted/20">
            {!row.is_verified ? (
              <Button variant="ghost" size="sm" className="flex-1 h-10 rounded-none text-xs text-emerald-500 hover:bg-emerald-500/10 font-medium" onClick={() => verifyEntity(row.id, 'doctor_profiles')}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Idhinisha
              </Button>
            ) : (
              <div className="flex-1 h-10 flex items-center justify-center text-xs text-emerald-500 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Amethibitishwa
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-primary border-l border-border/30" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive border-l border-border/30" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInstitutionCard = (row: any, type: string) => {
    const typeConfig: Record<string, { iconBg: string; iconColor: string }> = {
      hospitals: { iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
      polyclinics: { iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
      pharmacies: { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
      laboratories: { iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
    };
    const config = typeConfig[type] || typeConfig.hospitals;
    const TypeIcon = TABLES.find(t => t.name === type)?.icon || Building;

    return (
      <Card key={row.id} className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-5">
            <div className="relative">
              <Avatar className="h-14 w-14 rounded-2xl shadow-sm">
                {row.logo_url ? (
                  <AvatarImage src={row.logo_url} className="rounded-2xl object-cover" />
                ) : null}
                <AvatarFallback className={`rounded-2xl ${config.iconBg} ${config.iconColor}`}>
                  <TypeIcon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              {row.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-card shadow-sm">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{row.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{row.address}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {row.phone && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    <Phone className="h-3 w-3" /> {row.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5 text-xs">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{row.rating || 0}</span>
                  <span className="text-muted-foreground">({row.total_reviews || 0})</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-border/30 bg-muted/20">
            {!row.is_verified ? (
              <Button variant="ghost" size="sm" className="flex-1 h-10 rounded-none text-xs text-emerald-500 hover:bg-emerald-500/10 font-medium" onClick={() => verifyEntity(row.id, type)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Idhinisha
              </Button>
            ) : (
              <div className="flex-1 h-10 flex items-center justify-center text-xs text-emerald-500 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Imethibitishwa
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-primary border-l border-border/30" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive border-l border-border/30" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAppointmentCard = (row: any) => {
    const patientName = row.patient ? `${row.patient.first_name || ''} ${row.patient.last_name || ''}`.trim() : 'Mgonjwa';
    const doctorName = row.doctor ? `Dr. ${row.doctor.first_name || ''} ${row.doctor.last_name || ''}`.trim() : 'Daktari';
    const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
      scheduled: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-500' },
      approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500' },
      completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500' },
      cancelled: { bg: 'bg-rose-500/15', text: 'text-rose-400', dot: 'bg-rose-500' },
      pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-500' },
    };
    const sc = statusConfig[row.status] || statusConfig.pending;

    return (
      <Card key={row.id} className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center`}>
                  <CalendarCheck className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{patientName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{doctorName}</p>
                </div>
              </div>
              <Badge className={`${sc.bg} ${sc.text} border-0 text-[11px] font-medium px-2.5`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} mr-1.5 inline-block`} />
                {row.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                {new Date(row.appointment_date).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <Badge variant="outline" className="text-[11px] font-normal">{row.consultation_type || 'video'}</Badge>
              {row.fee && <span className="font-medium text-foreground">TZS {Number(row.fee).toLocaleString()}</span>}
            </div>
          </div>
          <div className="flex items-center border-t border-border/30 bg-muted/20">
            <Button variant="ghost" size="sm" className="flex-1 h-10 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive border-l border-border/30" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGenericCard = (row: any) => (
    <Card key={row.id} className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/40 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-5">
          <div className={`h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center`}>
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{row.name || row.title || row.id?.slice(0, 8)}</h3>
            {row.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.description}</p>}
          </div>
        </div>
        <div className="flex items-center border-t border-border/30 bg-muted/20">
          <Button variant="ghost" size="sm" className="flex-1 h-10 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Angalia
          </Button>
          <Button variant="ghost" size="sm" className="h-10 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive border-l border-border/30" onClick={() => deleteRow(row.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCards = () => {
    if (tableLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Inapakia...</p>
        </div>
      );
    }
    if (tableData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-20 w-20 rounded-3xl bg-muted/30 flex items-center justify-center">
            <Activity className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Hakuna data bado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Data itaonekana hapa baada ya kuongeza</p>
          </div>
        </div>
      );
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {tableData.map((row) => {
          switch (activeTable) {
            case 'profiles': return renderProfileCard(row);
            case 'doctor_profiles': return renderDoctorCard(row);
            case 'hospitals': return renderInstitutionCard(row, 'hospitals');
            case 'polyclinics': return renderInstitutionCard(row, 'polyclinics');
            case 'pharmacies': return renderInstitutionCard(row, 'pharmacies');
            case 'laboratories': return renderInstitutionCard(row, 'laboratories');
            case 'appointments': return renderAppointmentCard(row);
            default: return renderGenericCard(row);
          }
        })}
      </div>
    );
  };

  // ─── Beautiful Detail sheet ───
  const renderDetailSheet = () => {
    if (!viewingRow) return null;
    const excludeKeys = ['user_roles', 'profiles', 'patient', 'doctor'];

    const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined) return '—';
      if (typeof value === 'boolean') return value ? 'Ndio' : 'Hapana';
      if (key.includes('date') || key === 'created_at' || key === 'updated_at') {
        try { return new Date(value).toLocaleString('sw-TZ'); } catch { return String(value); }
      }
      if (key.includes('fee') || key === 'price' || key === 'payment_amount') {
        return `TZS ${Number(value).toLocaleString()}`;
      }
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      return String(value);
    };

    const getIcon = (key: string) => {
      if (key.includes('email')) return <Mail className="h-4 w-4" />;
      if (key.includes('phone')) return <Phone className="h-4 w-4" />;
      if (key.includes('address')) return <MapPin className="h-4 w-4" />;
      if (key.includes('website')) return <Globe className="h-4 w-4" />;
      if (key.includes('rating')) return <Star className="h-4 w-4" />;
      if (key.includes('verified')) return <CheckCircle2 className="h-4 w-4" />;
      if (key.includes('date') || key.includes('created') || key.includes('updated')) return <Clock className="h-4 w-4" />;
      if (key.includes('fee') || key.includes('price')) return <TrendingUp className="h-4 w-4" />;
      if (key.includes('license') || key.includes('experience')) return <Award className="h-4 w-4" />;
      return <Hash className="h-4 w-4" />;
    };

    const labelMap: Record<string, string> = {
      id: 'ID', name: 'Jina', first_name: 'Jina la kwanza', last_name: 'Jina la mwisho',
      email: 'Barua pepe', phone: 'Simu', address: 'Anuani', description: 'Maelezo',
      is_verified: 'Imethibitishwa', is_available: 'Inapatikana', rating: 'Kiwango',
      consultation_fee: 'Bei ya ushauri', experience_years: 'Miaka ya uzoefu',
      license_number: 'Nambari ya leseni', hospital_name: 'Hospitali',
      created_at: 'Iliundwa', updated_at: 'Ilisasishwa', status: 'Hali',
      consultation_type: 'Aina', appointment_date: 'Tarehe ya miadi',
      owner_id: 'Mmiliki ID', user_id: 'Mtumiaji ID', patient_id: 'Mgonjwa ID',
      doctor_id: 'Daktari ID', role: 'Jukumu', country: 'Nchi',
      is_promoted: 'Inatangazwa', website: 'Tovuti', services: 'Huduma',
      logo_url: 'Picha', avatar_url: 'Picha', bio: 'Wasifu',
      total_reviews: 'Maoni jumla', polyclinic_name: 'Polyclinic',
      username: 'Jina la mtumiaji', country_code: 'Msimbo wa nchi',
      specialty_id: 'Utaalamu ID', insurance_id: 'Bima ID',
      duration_minutes: 'Muda (dakika)', symptoms: 'Dalili',
      notes: 'Maelezo', prescription: 'Dawa iliyoandikwa',
      payment_status: 'Hali ya malipo', meeting_room_id: 'Chumba cha mkutano',
    };

    const displayName = viewingRow.name || `${viewingRow.first_name || ''} ${viewingRow.last_name || ''}`.trim() || 'Maelezo';

    return (
      <Sheet open={!!viewingRow} onOpenChange={() => setViewingRow(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl border-t-2 border-primary/20">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                {activeTable === 'profiles' ? <Users className="h-5 w-5 text-primary" /> :
                 activeTable === 'doctor_profiles' ? <Stethoscope className="h-5 w-5 text-primary" /> :
                 activeTable === 'appointments' ? <CalendarCheck className="h-5 w-5 text-primary" /> :
                 <Building className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <SheetTitle className="text-lg">{displayName}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {TABLES.find(t => t.name === activeTable)?.label || activeTable}
                </p>
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-100px)]">
            <div className="space-y-1 pr-4">
              {Object.entries(viewingRow)
                .filter(([key]) => !excludeKeys.includes(key))
                .map(([key, value]) => {
                  const formattedValue = formatValue(key, value);
                  const isBool = typeof value === 'boolean';
                  return (
                    <div key={key} className="flex items-center gap-3 py-3 border-b border-border/20 last:border-0 group/item hover:bg-muted/20 rounded-xl px-3 -mx-3 transition-colors">
                      <div className="text-muted-foreground/60 group-hover/item:text-muted-foreground transition-colors">
                        {getIcon(key)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                          {labelMap[key] || key.replace(/_/g, ' ')}
                        </p>
                        <p className={`text-sm mt-0.5 break-all ${formattedValue === '—' ? 'text-muted-foreground/40 italic' : 'text-foreground'}`}>
                          {isBool ? (
                            <Badge variant={value ? 'default' : 'secondary'} className={`text-[11px] ${value ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                              {value ? '✓ Ndio' : '✗ Hapana'}
                            </Badge>
                          ) : formattedValue}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Inapakia dashboard...</p>
      </div>
    );
  }

  const activeTableConfig = TABLES.find(t => t.name === activeTable);

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Stats grid - no hero header */}
      <div className="p-4 pt-6">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {statCards.map((s, i) => (
            <Card key={i} className="border-border/40 hover:shadow-md transition-all duration-300">
              <CardContent className="p-4 text-center">
                <div className={`h-10 w-10 rounded-2xl ${s.color} flex items-center justify-center mx-auto mb-2`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main tabs */}
      <div className="px-4">
        <Tabs defaultValue="database" className="space-y-5">
          <TabsList className="w-full h-auto bg-muted/30 p-1.5 rounded-2xl grid grid-cols-4 gap-1">
            <TabsTrigger value="database" className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2.5">
              <Activity className="h-3.5 w-3.5 mr-1.5" />Data
            </TabsTrigger>
            <TabsTrigger value="register-user" className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2.5">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />Mtumiaji
            </TabsTrigger>
            <TabsTrigger value="register-org" className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2.5">
              <Building className="h-3.5 w-3.5 mr-1.5" />Shirika
            </TabsTrigger>
            <TabsTrigger value="register-doctor" className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2.5">
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />Daktari
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-4 mt-2">
            {/* Table selector pills */}
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {TABLES.map((t) => {
                  const isActive = activeTable === t.name;
                  return (
                    <button
                      key={t.name}
                      onClick={() => setActiveTable(t.name)}
                      className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                      }`}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold text-foreground">
                  {activeTableConfig?.label}
                </h2>
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                  {tableData.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchTableData(activeTable)}
                className="h-9 text-xs rounded-xl px-4"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${tableLoading ? 'animate-spin' : ''}`} />
                Pakia upya
              </Button>
            </div>

            {renderCards()}
          </TabsContent>

          <TabsContent value="register-user"><RegisterUserForm /></TabsContent>
          <TabsContent value="register-org"><RegisterOrganizationForm /></TabsContent>
          <TabsContent value="register-doctor"><RegisterDoctorForm /></TabsContent>
        </Tabs>
      </div>

      {renderDetailSheet()}
    </div>
  );
}

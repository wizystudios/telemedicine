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
  Shield, Users, Building, Pill, TestTube, Activity, Plus, Trash2,
  Eye, RefreshCw, Star, Phone, MapPin, Clock, CheckCircle2,
  Stethoscope, CalendarCheck, TrendingUp, UserPlus, Building2,
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
    { label: 'Watumiaji', value: stats.totalUsers, icon: Users, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Madaktari', value: stats.totalDoctors, icon: Stethoscope, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Hospitali', value: stats.totalHospitals, icon: Building, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Famasi', value: stats.totalPharmacies, icon: Pill, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Maabara', value: stats.totalLabs, icon: TestTube, gradient: 'from-rose-500 to-pink-600' },
    { label: 'Miadi', value: stats.totalAppointments, icon: CalendarCheck, gradient: 'from-cyan-500 to-sky-600' },
  ];

  // ─── Card renderers ───
  const renderProfileCard = (row: any) => {
    const role = row.role || 'patient';
    const roleColors: Record<string, string> = {
      super_admin: 'bg-rose-500/10 text-rose-600 border-rose-200',
      admin: 'bg-violet-500/10 text-violet-600 border-violet-200',
      doctor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      hospital_owner: 'bg-blue-500/10 text-blue-600 border-blue-200',
      pharmacy_owner: 'bg-amber-500/10 text-amber-600 border-amber-200',
      lab_owner: 'bg-pink-500/10 text-pink-600 border-pink-200',
      patient: 'bg-sky-500/10 text-sky-600 border-sky-200',
    };

    return (
      <Card key={row.id} className="group hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarImage src={row.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                {row.first_name?.[0] || row.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {row.first_name || ''} {row.last_name || ''}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{row.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className={`text-[10px] capitalize font-medium ${roleColors[role] || ''}`}>
                  {role.replace(/_/g, ' ')}
                </Badge>
                {row.country && (
                  <span className="text-[10px] text-muted-foreground">{row.country}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
            <Select onValueChange={(value) => changeUserRole(row.id, value)}>
              <SelectTrigger className="flex-1 h-9 border-0 rounded-none text-xs bg-transparent hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="Badili Role" />
              </SelectTrigger>
              <SelectContent>
                {['patient', 'doctor', 'hospital_owner', 'pharmacy_owner', 'lab_owner', 'admin', 'super_admin'].map((r) => (
                  <SelectItem key={r} value={r} className="text-xs capitalize">{r.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row.id)}>
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
      <Card key={row.id} className="group hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-emerald-500/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 font-semibold">
                  {profile?.first_name?.[0] || 'D'}
                </AvatarFallback>
              </Avatar>
              {row.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-card">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">
                Dr. {profile?.first_name || ''} {profile?.last_name || ''}
              </h3>
              <p className="text-xs text-muted-foreground">{row.hospital_name || row.polyclinic_name || 'Daktari Binafsi'}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{row.experience_years || 0} miaka</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <span>TZS {row.consultation_fee?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{row.rating || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
            {!row.is_verified ? (
              <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-none text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => verifyEntity(row.id, 'doctor_profiles')}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Idhinisha
              </Button>
            ) : (
              <div className="flex-1 h-9 flex items-center justify-center text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Amethibitishwa
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInstitutionCard = (row: any, type: string) => {
    const typeConfig: Record<string, { gradient: string; iconColor: string }> = {
      hospitals: { gradient: 'from-blue-500/20 to-indigo-500/10', iconColor: 'text-blue-600' },
      polyclinics: { gradient: 'from-violet-500/20 to-purple-500/10', iconColor: 'text-violet-600' },
      pharmacies: { gradient: 'from-amber-500/20 to-orange-500/10', iconColor: 'text-amber-600' },
      laboratories: { gradient: 'from-rose-500/20 to-pink-500/10', iconColor: 'text-rose-600' },
    };
    const config = typeConfig[type] || typeConfig.hospitals;
    const TypeIcon = TABLES.find(t => t.name === type)?.icon || Building;

    return (
      <Card key={row.id} className="group hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4">
            <div className="relative">
              <Avatar className="h-12 w-12 rounded-xl">
                {row.logo_url ? (
                  <AvatarImage src={row.logo_url} className="rounded-xl object-cover" />
                ) : null}
                <AvatarFallback className={`rounded-xl bg-gradient-to-br ${config.gradient} ${config.iconColor}`}>
                  <TypeIcon className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              {row.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-card">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{row.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{row.address}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {row.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {row.phone}
                  </div>
                )}
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{row.rating || 0}</span>
                  <span className="text-[10px] text-muted-foreground">({row.total_reviews || 0})</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
            {!row.is_verified ? (
              <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-none text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => verifyEntity(row.id, type)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Idhinisha
              </Button>
            ) : (
              <div className="flex-1 h-9 flex items-center justify-center text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Imethibitishwa
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row.id)}>
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
      scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' },
      completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
      cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-600', dot: 'bg-rose-500' },
      pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
    };
    const sc = statusConfig[row.status] || statusConfig.pending;

    return (
      <Card key={row.id} className="group hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-500/10 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{patientName}</h3>
                  <p className="text-xs text-muted-foreground">{doctorName}</p>
                </div>
              </div>
              <Badge className={`${sc.bg} ${sc.text} border-0 text-[10px] font-medium`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} mr-1 inline-block`} />
                {row.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(row.appointment_date).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <Badge variant="outline" className="text-[10px] font-normal">{row.consultation_type || 'video'}</Badge>
              {row.fee && <span className="font-medium text-foreground">TZS {Number(row.fee).toLocaleString()}</span>}
            </div>
          </div>
          <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
            <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Angalia
            </Button>
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGenericCard = (row: any) => (
    <Card key={row.id} className="group hover:shadow-md transition-all duration-200 border-border/50">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{row.name || row.title || row.id?.slice(0, 8)}</h3>
            {row.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{row.description}</p>}
          </div>
        </div>
        <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
          <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-none text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRow(row)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Angalia
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-4 rounded-none text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCards = () => {
    if (tableLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Inapakia...</p>
        </div>
      );
    }
    if (tableData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Activity className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Hakuna data bado</p>
        </div>
      );
    }
    return (
      <div className="grid gap-3">
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

  // ─── Detail sheet ───
  const renderDetailSheet = () => {
    if (!viewingRow) return null;
    const excludeKeys = ['user_roles', 'profiles', 'patient', 'doctor'];
    const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined) return '—';
      if (typeof value === 'boolean') return value ? '✓ Ndio' : '✗ Hapana';
      if (key.includes('date') || key === 'created_at' || key === 'updated_at') {
        try { return new Date(value).toLocaleString('sw-TZ'); } catch { return String(value); }
      }
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      return String(value);
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
      total_reviews: 'Maoni', polyclinic_name: 'Polyclinic',
    };

    return (
      <Sheet open={!!viewingRow} onOpenChange={() => setViewingRow(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base">
              {viewingRow.name || `${viewingRow.first_name || ''} ${viewingRow.last_name || ''}`.trim() || 'Maelezo'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-80px)]">
            <div className="space-y-1 pr-2">
              {Object.entries(viewingRow)
                .filter(([key]) => !excludeKeys.includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4 py-2.5 border-b border-border/30 last:border-0">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">
                      {labelMap[key] || key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-foreground text-right break-all">
                      {formatValue(key, value)}
                    </span>
                  </div>
                ))}
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
    <div className="max-w-2xl mx-auto pb-24">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Dhibiti mfumo wote wa TeleMed</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 -mt-1">
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {statCards.map((s, i) => (
            <div
              key={i}
              className={`rounded-2xl bg-gradient-to-br ${s.gradient} p-3.5 text-white relative overflow-hidden`}
            >
              <s.icon className="h-4 w-4 opacity-80 mb-1.5" />
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-[10px] opacity-80 mt-1 font-medium">{s.label}</p>
              <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Main tabs */}
      <div className="px-4">
        <Tabs defaultValue="database" className="space-y-4">
          <TabsList className="w-full h-auto bg-muted/50 p-1 rounded-2xl grid grid-cols-4 gap-1">
            <TabsTrigger value="database" className="text-[11px] data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2">
              <Activity className="h-3.5 w-3.5 mr-1" />Data
            </TabsTrigger>
            <TabsTrigger value="register-user" className="text-[11px] data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2">
              <UserPlus className="h-3.5 w-3.5 mr-1" />Mtumiaji
            </TabsTrigger>
            <TabsTrigger value="register-org" className="text-[11px] data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2">
              <Building className="h-3.5 w-3.5 mr-1" />Shirika
            </TabsTrigger>
            <TabsTrigger value="register-doctor" className="text-[11px] data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl py-2">
              <Stethoscope className="h-3.5 w-3.5 mr-1" />Daktari
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
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {activeTableConfig?.label}
                </h2>
                <Badge variant="secondary" className="text-xs font-medium">
                  {tableData.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchTableData(activeTable)}
                className="h-8 text-xs rounded-xl"
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

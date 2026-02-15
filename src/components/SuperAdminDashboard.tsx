import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Building, Pill, TestTube, Activity, Plus, Trash2, Check, X, Eye, RefreshCw, Database, Star, Phone, Mail, MapPin, Clock, CheckCircle2, XCircle, UserCheck } from 'lucide-react';
import RegisterOrganizationForm from '@/components/super-admin/RegisterOrganizationForm';
import RegisterDoctorForm from '@/components/super-admin/RegisterDoctorForm';
import RegisterUserForm from '@/components/super-admin/RegisterUserForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AppRole = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner' | 'admin' | 'super_admin' | 'polyclinic_owner';

const TABLES = [
  { name: 'profiles', label: 'Watumiaji', icon: Users },
  { name: 'doctor_profiles', label: 'Madaktari', icon: Activity },
  { name: 'hospitals', label: 'Hospitali', icon: Building },
  { name: 'polyclinics', label: 'Polyclinic', icon: Building },
  { name: 'pharmacies', label: 'Famasi', icon: Pill },
  { name: 'laboratories', label: 'Maabara', icon: TestTube },
  { name: 'appointments', label: 'Miadi', icon: Clock },
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
          query = supabase.from('profiles').select('*, user_roles(role)');
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

  // ─── Card renderers per table ───
  const renderProfileCard = (row: any) => {
    const role = row.user_roles?.[0]?.role || row.role || 'patient';
    return (
      <Card key={row.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={row.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {row.first_name?.[0] || row.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {row.first_name || ''} {row.last_name || ''}
              </p>
              <p className="text-xs text-muted-foreground truncate">{row.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] capitalize">{role}</Badge>
                {row.phone && <span className="text-[10px] text-muted-foreground">{row.phone}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Select onValueChange={(value) => changeUserRole(row.id, value)}>
                <SelectTrigger className="h-7 w-24 text-[10px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {['patient', 'doctor', 'hospital_owner', 'pharmacy_owner', 'lab_owner', 'admin', 'super_admin'].map((r) => (
                    <SelectItem key={r} value={r} className="text-xs capitalize">{r.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setViewingRow(row)}>
                  <Eye className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteRow(row.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDoctorCard = (row: any) => {
    const profile = row.profiles;
    return (
      <Card key={row.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {profile?.first_name?.[0] || 'D'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                Dr. {profile?.first_name || ''} {profile?.last_name || ''}
              </p>
              <p className="text-xs text-muted-foreground">{row.hospital_name || 'Binafsi'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" /> {row.experience_years || 0} miaka
                </span>
                <span className="text-[10px] text-muted-foreground">
                  TZS {row.consultation_fee?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 text-yellow-500" /> {row.rating || 0}
                </span>
                {row.is_verified ? (
                  <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-1.5 py-0">Imethibitishwa</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300 px-1.5 py-0">Haijaverify</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {!row.is_verified && (
                <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => verifyEntity(row.id, 'doctor_profiles')}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />Idhinisha
                </Button>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setViewingRow(row)}>
                  <Eye className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteRow(row.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInstitutionCard = (row: any, type: string) => (
    <Card key={row.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarImage src={row.logo_url} className="rounded-xl" />
            <AvatarFallback className="bg-primary/10 text-primary text-sm rounded-xl">
              {row.name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{row.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{row.address}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {row.phone && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Phone className="h-2.5 w-2.5" /> {row.phone}
                </span>
              )}
              <span className="text-[10px] flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 text-yellow-500" /> {row.rating || 0}
              </span>
              {row.is_verified ? (
                <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-1.5 py-0">Imethibitishwa</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300 px-1.5 py-0">Haijaverify</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {!row.is_verified && (
              <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => verifyEntity(row.id, type)}>
                <CheckCircle2 className="h-3 w-3 mr-1" />Idhinisha
              </Button>
            )}
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setViewingRow(row)}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteRow(row.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAppointmentCard = (row: any) => {
    const patientName = row.patient ? `${row.patient.first_name || ''} ${row.patient.last_name || ''}`.trim() : row.patient_id?.slice(0, 8);
    const doctorName = row.doctor ? `Dr. ${row.doctor.first_name || ''} ${row.doctor.last_name || ''}`.trim() : row.doctor_id?.slice(0, 8);
    const statusColor: Record<string, string> = {
      scheduled: 'bg-blue-500/10 text-blue-600',
      completed: 'bg-primary/10 text-primary',
      cancelled: 'bg-destructive/10 text-destructive',
    };
    return (
      <Card key={row.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-sm">{patientName}</p>
              <p className="text-xs text-muted-foreground">{doctorName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(row.appointment_date).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <Badge className={`text-[10px] border-0 px-1.5 py-0 ${statusColor[row.status] || 'bg-muted text-muted-foreground'}`}>
                  {row.status}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{row.consultation_type}</Badge>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setViewingRow(row)}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteRow(row.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGenericCard = (row: any) => (
    <Card key={row.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{row.name || row.title || row.id?.slice(0, 8)}</p>
            {row.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{row.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setViewingRow(row)}>
              <Eye className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteRow(row.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCards = () => {
    if (tableLoading) {
      return <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-primary" /></div>;
    }
    if (tableData.length === 0) {
      return <p className="text-center text-sm text-muted-foreground py-8">Hakuna data</p>;
    }
    return (
      <div className="space-y-2">
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

  // ─── Detail sheet: show readable fields ───
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
            <div className="space-y-3 pr-2">
              {Object.entries(viewingRow)
                .filter(([key]) => !excludeKeys.includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {labelMap[key] || key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-foreground break-all">
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
    return <div className="flex items-center justify-center h-screen"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Super Admin</h1>
          <p className="text-xs text-muted-foreground">Dhibiti mfumo wote</p>
        </div>
      </div>

      {/* Stats - scrollable row */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {[
            { label: 'Watumiaji', value: stats.totalUsers, icon: Users },
            { label: 'Madaktari', value: stats.totalDoctors, icon: Activity },
            { label: 'Hospitali', value: stats.totalHospitals, icon: Building },
            { label: 'Polyclinic', value: stats.totalPolyclinics, icon: Building },
            { label: 'Famasi', value: stats.totalPharmacies, icon: Pill },
            { label: 'Maabara', value: stats.totalLabs, icon: TestTube },
            { label: 'Miadi', value: stats.totalAppointments, icon: Clock },
          ].map((s, i) => (
            <Card key={i} className="shrink-0 min-w-[80px]">
              <CardContent className="p-3 text-center">
                <s.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Main Tabs */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent p-0">
          <TabsTrigger value="database" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3">
            <Database className="h-3 w-3 mr-1" />Database
          </TabsTrigger>
          <TabsTrigger value="register-user" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3">
            <Plus className="h-3 w-3 mr-1" />Mtumiaji
          </TabsTrigger>
          <TabsTrigger value="register-org" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3">
            <Plus className="h-3 w-3 mr-1" />Shirika
          </TabsTrigger>
          <TabsTrigger value="register-doctor" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3">
            <Plus className="h-3 w-3 mr-1" />Daktari
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-3">
          {/* Table Selector - scrollable pills */}
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-2">
              {TABLES.map((t) => (
                <Button
                  key={t.name}
                  variant={activeTable === t.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTable(t.name)}
                  className="text-xs shrink-0 rounded-full"
                >
                  <t.icon className="h-3 w-3 mr-1" />
                  {t.label}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Header with count + refresh */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {TABLES.find(t => t.name === activeTable)?.label} ({tableData.length})
            </h2>
            <Button size="sm" variant="ghost" onClick={() => fetchTableData(activeTable)} className="h-7 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${tableLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Card list */}
          {renderCards()}
        </TabsContent>

        <TabsContent value="register-user"><RegisterUserForm /></TabsContent>
        <TabsContent value="register-org"><RegisterOrganizationForm /></TabsContent>
        <TabsContent value="register-doctor"><RegisterDoctorForm /></TabsContent>
      </Tabs>

      {renderDetailSheet()}
    </div>
  );
}

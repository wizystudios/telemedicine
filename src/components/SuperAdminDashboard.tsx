import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Building, Pill, TestTube, Activity, Plus, Trash2, Check, X, Eye, RefreshCw, Database } from 'lucide-react';
import RegisterOrganizationForm from '@/components/super-admin/RegisterOrganizationForm';
import RegisterDoctorForm from '@/components/super-admin/RegisterDoctorForm';
import RegisterUserForm from '@/components/super-admin/RegisterUserForm';

type AppRole = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner' | 'admin' | 'super_admin' | 'polyclinic_owner';
type UserRole = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner' | 'admin';

const TABLES = [
  { name: 'profiles', label: 'Watumiaji', icon: Users },
  { name: 'doctor_profiles', label: 'Madaktari', icon: Activity },
  { name: 'hospitals', label: 'Hospitali', icon: Building },
  { name: 'polyclinics', label: 'Polyclinic', icon: Building },
  { name: 'pharmacies', label: 'Famasi', icon: Pill },
  { name: 'laboratories', label: 'Maabara', icon: TestTube },
  { name: 'appointments', label: 'Miadi', icon: Activity },
  { name: 'specialties', label: 'Utaalamu', icon: Activity },
] as const;

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0, totalDoctors: 0, totalHospitals: 0, totalPolyclinics: 0,
    totalPharmacies: 0, totalLabs: 0, totalAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Table management
  const [activeTable, setActiveTable] = useState('profiles');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [viewingRow, setViewingRow] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTableData(activeTable);
  }, [activeTable]);

  const fetchStats = async () => {
    try {
      const [
        { count: usersCount },
        { count: doctorsCount },
        { count: hospitalsCount },
        { count: polyclinicsCount },
        { count: pharmaciesCount },
        { count: labsCount },
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
        totalUsers: usersCount || 0,
        totalDoctors: doctorsCount || 0,
        totalHospitals: hospitalsCount || 0,
        totalPolyclinics: polyclinicsCount || 0,
        totalPharmacies: pharmaciesCount || 0,
        totalLabs: labsCount || 0,
        totalAppointments: appointmentsCount || 0,
      });
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setTableLoading(true);
    try {
      let data: any[] = [];
      
      switch (tableName) {
        case 'profiles':
          const { data: profiles } = await supabase.from('profiles').select('*, user_roles(role)').order('created_at', { ascending: false }).limit(100);
          data = profiles || [];
          break;
        case 'doctor_profiles':
          const { data: doctors } = await supabase.from('doctor_profiles').select('*').order('created_at', { ascending: false }).limit(100);
          data = doctors || [];
          break;
        case 'hospitals':
          const { data: hospitals } = await supabase.from('hospitals').select('*').order('created_at', { ascending: false }).limit(100);
          data = hospitals || [];
          break;
        case 'polyclinics':
          const { data: polyclinics } = await supabase.from('polyclinics').select('*').order('created_at', { ascending: false }).limit(100);
          data = polyclinics || [];
          break;
        case 'pharmacies':
          const { data: pharmacies } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false }).limit(100);
          data = pharmacies || [];
          break;
        case 'laboratories':
          const { data: labs } = await supabase.from('laboratories').select('*').order('created_at', { ascending: false }).limit(100);
          data = labs || [];
          break;
        case 'appointments':
          const { data: appointments } = await supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(100);
          data = appointments || [];
          break;
        case 'specialties':
          const { data: specialties } = await supabase.from('specialties').select('*').order('created_at', { ascending: false }).limit(100);
          data = specialties || [];
          break;
      }
      
      setTableData(data);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally {
      setTableLoading(false);
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta?')) return;
    try {
      let error;
      switch (activeTable) {
        case 'profiles':
          ({ error } = await supabase.from('profiles').delete().eq('id', id));
          break;
        case 'doctor_profiles':
          ({ error } = await supabase.from('doctor_profiles').delete().eq('id', id));
          break;
        case 'hospitals':
          ({ error } = await supabase.from('hospitals').delete().eq('id', id));
          break;
        case 'polyclinics':
          ({ error } = await supabase.from('polyclinics').delete().eq('id', id));
          break;
        case 'pharmacies':
          ({ error } = await supabase.from('pharmacies').delete().eq('id', id));
          break;
        case 'laboratories':
          ({ error } = await supabase.from('laboratories').delete().eq('id', id));
          break;
        case 'appointments':
          ({ error } = await supabase.from('appointments').delete().eq('id', id));
          break;
      }
      if (error) throw error;
      toast({ title: 'Imefanikiwa', description: 'Imefutwa' });
      fetchTableData(activeTable);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    }
  };

  const verifyEntity = async (id: string, tableName: string) => {
    try {
      let error;
      switch (tableName) {
        case 'hospitals':
          ({ error } = await supabase.from('hospitals').update({ is_verified: true }).eq('id', id));
          break;
        case 'polyclinics':
          ({ error } = await supabase.from('polyclinics').update({ is_verified: true }).eq('id', id));
          break;
        case 'pharmacies':
          ({ error } = await supabase.from('pharmacies').update({ is_verified: true }).eq('id', id));
          break;
        case 'laboratories':
          ({ error } = await supabase.from('laboratories').update({ is_verified: true }).eq('id', id));
          break;
        case 'doctor_profiles':
          ({ error } = await supabase.from('doctor_profiles').update({ is_verified: true }).eq('id', id));
          break;
      }
      if (error) throw error;
      toast({ title: 'Imeidhinishwa!' });
      fetchTableData(activeTable);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        await supabase.from('user_roles').update({ role: newRole as AppRole }).eq('user_id', userId);
      } else {
        await supabase.from('user_roles').insert({ user_id: userId, role: newRole as AppRole });
      }

      // Also update profiles table role
      await supabase.from('profiles').update({ role: newRole as UserRole }).eq('id', userId);

      toast({ title: 'Imefanikiwa', description: `Role imebadilishwa kuwa ${newRole}` });
      fetchTableData(activeTable);
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    }
  };

  const getTableColumns = (tableName: string) => {
    const tableColumns: Record<string, string[]> = {
      profiles: ['first_name', 'last_name', 'email', 'phone', 'role', 'country'],
      doctor_profiles: ['user_id', 'license_number', 'hospital_name', 'experience_years', 'consultation_fee', 'is_verified', 'is_available', 'rating'],
      hospitals: ['name', 'address', 'phone', 'email', 'is_verified', 'rating'],
      polyclinics: ['name', 'address', 'phone', 'email', 'is_verified', 'rating'],
      pharmacies: ['name', 'address', 'phone', 'is_verified', 'rating'],
      laboratories: ['name', 'address', 'phone', 'is_verified', 'rating'],
      appointments: ['patient_id', 'doctor_id', 'appointment_date', 'status', 'consultation_type'],
      specialties: ['name', 'description', 'icon'],
    };
    return tableColumns[tableName] || [];
  };

  const renderCellValue = (row: any, col: string) => {
    const value = row[col];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />;
    if (col === 'created_at' || col === 'appointment_date') return new Date(value).toLocaleDateString('sw-TZ');
    if (col === 'role') return <Badge variant="outline">{row.user_roles?.[0]?.role || value || 'patient'}</Badge>;
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 30);
    return String(value).slice(0, 50);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Super Admin</h1>
          <p className="text-xs text-muted-foreground">Dhibiti mfumo wote</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {[
          { label: 'Watumiaji', value: stats.totalUsers, icon: Users },
          { label: 'Madaktari', value: stats.totalDoctors, icon: Activity },
          { label: 'Hospitali', value: stats.totalHospitals, icon: Building },
          { label: 'Polyclinic', value: stats.totalPolyclinics, icon: Building },
          { label: 'Famasi', value: stats.totalPharmacies, icon: Pill },
          { label: 'Maabara', value: stats.totalLabs, icon: TestTube },
          { label: 'Miadi', value: stats.totalAppointments, icon: Activity },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <s.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="database" className="text-xs"><Database className="h-3 w-3 mr-1" />Database</TabsTrigger>
          <TabsTrigger value="register-user" className="text-xs"><Plus className="h-3 w-3 mr-1" />Mtumiaji</TabsTrigger>
          <TabsTrigger value="register-org" className="text-xs"><Plus className="h-3 w-3 mr-1" />Shirika</TabsTrigger>
          <TabsTrigger value="register-doctor" className="text-xs"><Plus className="h-3 w-3 mr-1" />Daktari</TabsTrigger>
        </TabsList>

        {/* Database Management */}
        <TabsContent value="database" className="space-y-4">
          {/* Table Selector */}
          <div className="flex flex-wrap gap-2">
            {TABLES.map((t) => (
              <Button
                key={t.name}
                variant={activeTable === t.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTable(t.name)}
                className="text-xs"
              >
                <t.icon className="h-3 w-3 mr-1" />
                {t.label}
              </Button>
            ))}
          </div>

          {/* Table Data */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{TABLES.find(t => t.name === activeTable)?.label} ({tableData.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => fetchTableData(activeTable)}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${tableLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {getTableColumns(activeTable).map((col) => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                      ))}
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow key={row.id}>
                        {getTableColumns(activeTable).map((col) => (
                          <TableCell key={col} className="text-xs py-2">
                            {renderCellValue(row, col)}
                          </TableCell>
                        ))}
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewingRow(row)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            
                            {/* Role change for profiles */}
                            {activeTable === 'profiles' && (
                              <Select onValueChange={(value) => changeUserRole(row.id, value)}>
                                <SelectTrigger className="h-7 w-20 text-[10px]">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {['patient', 'doctor', 'hospital_owner', 'pharmacy_owner', 'lab_owner', 'admin', 'super_admin'].map((r) => (
                                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            {/* Verify button */}
                            {['hospitals', 'polyclinics', 'pharmacies', 'laboratories', 'doctor_profiles'].includes(activeTable) && !row.is_verified && (
                              <Button size="sm" className="h-7 text-[10px]" onClick={() => verifyEntity(row.id, activeTable)}>
                                <Check className="h-3 w-3 mr-1" />Idhinisha
                              </Button>
                            )}
                            
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteRow(row.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register-user">
          <RegisterUserForm />
        </TabsContent>

        <TabsContent value="register-org">
          <RegisterOrganizationForm />
        </TabsContent>

        <TabsContent value="register-doctor">
          <RegisterDoctorForm />
        </TabsContent>
      </Tabs>

      {/* View Row Dialog */}
      <Dialog open={!!viewingRow} onOpenChange={() => setViewingRow(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maelezo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {viewingRow && Object.entries(viewingRow).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-sm">
                <span className="font-medium min-w-[100px]">{key}:</span>
                <span className="text-muted-foreground break-all">
                  {value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

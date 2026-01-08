import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, MessageCircle, Users, Clock, CheckCircle, XCircle, 
  Video, Phone, Activity, Loader2, AlertCircle, Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { ContentUploadSection } from '@/components/ContentUploadSection';

export function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { updateOnlineStatus } = useOnlineStatus();
  
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({ today: 0, pending: 0, completed: 0, rating: 0 });
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Decline dialog state
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
      fetchOnlineStatus();
    }
  }, [user?.id]);

  const fetchOnlineStatus = async () => {
    const { data } = await supabase
      .from('doctor_online_status')
      .select('is_online')
      .eq('doctor_id', user?.id)
      .single();
    setIsOnline(data?.is_online || false);
  };

  const handleOnlineToggle = async (online: boolean) => {
    setIsOnline(online);
    await updateOnlineStatus(online);
  };

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch pending appointments
      const { data: pending } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)')
        .eq('doctor_id', user?.id)
        .eq('status', 'pending')
        .order('appointment_date', { ascending: true })
        .limit(10);

      // Fetch today's confirmed appointments
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)')
        .eq('doctor_id', user?.id)
        .gte('appointment_date', today)
        .lt('appointment_date', today + 'T23:59:59')
        .order('appointment_date', { ascending: true });

      // Fetch stats
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user?.id)
        .gte('appointment_date', today);

      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user?.id)
        .eq('status', 'completed')
        .gte('appointment_date', today);

      // Fetch doctor rating
      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('rating')
        .eq('user_id', user?.id)
        .single();

      // Fetch contents
      const { data: contentsData } = await supabase
        .from('institution_content')
        .select('*')
        .eq('institution_type', 'doctor')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      setContents(contentsData || []);
      setPendingAppointments(pending || []);
      setTodayAppointments(todayAppts || []);
      setStats({
        today: todayCount || 0,
        pending: pending?.length || 0,
        completed: completedCount || 0,
        rating: doctorProfile?.rating || 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Check if the time slot is available (no double booking)
  const checkTimeSlotAvailable = async (appointmentDate: string, appointmentId: string) => {
    const date = new Date(appointmentDate);
    const startTime = new Date(date.getTime() - 30 * 60000).toISOString(); // 30 min before
    const endTime = new Date(date.getTime() + 30 * 60000).toISOString(); // 30 min after
    
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', user?.id)
      .eq('status', 'approved')
      .neq('id', appointmentId)
      .gte('appointment_date', startTime)
      .lte('appointment_date', endTime);
    
    return !conflicts || conflicts.length === 0;
  };

  const handleAccept = async (appointment: any) => {
    setIsProcessing(true);
    
    // Check for double booking
    const isAvailable = await checkTimeSlotAvailable(appointment.appointment_date, appointment.id);
    
    if (!isAvailable) {
      toast({ 
        title: 'Wakati Umeshatwaliwa', 
        description: 'Una mgonjwa mwingine wakati huu. Pendekeza wakati tofauti.',
        variant: 'destructive' 
      });
      setIsProcessing(false);
      return;
    }

    // Update appointment status
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'approved' })
      .eq('id', appointment.id);

    if (error) {
      toast({ title: 'Kosa', description: 'Imeshindikana', variant: 'destructive' });
    } else {
      // Create notification for patient
      await supabase.from('notifications').insert([{
        user_id: appointment.patient_id,
        title: 'Miadi Imekubaliwa ✅',
        message: `Daktari amekubali miadi yako ya tarehe ${new Date(appointment.appointment_date).toLocaleDateString('sw-TZ')}`,
        type: 'appointment'
      }]);

      toast({ title: 'Imefanikiwa', description: 'Miadi imekubaliwa' });
      fetchData();
    }
    setIsProcessing(false);
  };

  const openDeclineDialog = (appointment: any) => {
    setSelectedAppointment(appointment);
    setDeclineReason('');
    setSuggestedDate('');
    setSuggestedTime('');
    setDeclineDialogOpen(true);
  };

  const handleDecline = async () => {
    if (!selectedAppointment) return;
    
    if (!declineReason.trim()) {
      toast({ 
        title: 'Sababu Inahitajika', 
        description: 'Tafadhali eleza sababu ya kukataa miadi',
        variant: 'destructive' 
      });
      return;
    }

    setIsProcessing(true);

    // Build suggested time if provided
    let suggestedTimeStr = null;
    if (suggestedDate && suggestedTime) {
      suggestedTimeStr = `${suggestedDate}T${suggestedTime}:00`;
    }

    const { error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        notes: `Sababu: ${declineReason}${suggestedTimeStr ? ` | Wakati uliopendekezwa: ${new Date(suggestedTimeStr).toLocaleString('sw-TZ')}` : ''}`,
        suggested_time: suggestedTimeStr
      })
      .eq('id', selectedAppointment.id);

    if (error) {
      toast({ title: 'Kosa', description: 'Imeshindikana', variant: 'destructive' });
    } else {
      // Create notification for patient with reason
      await supabase.from('notifications').insert([{
        user_id: selectedAppointment.patient_id,
        title: 'Miadi Imekataliwa ❌',
        message: `Daktari amekataa miadi yako. Sababu: ${declineReason}${suggestedTimeStr ? `. Wakati uliopendekezwa: ${new Date(suggestedTimeStr).toLocaleString('sw-TZ')}` : ''}`,
        type: 'appointment'
      }]);

      toast({ title: 'Miadi Imekataliwa', description: 'Mgonjwa amepokea taarifa' });
      setDeclineDialogOpen(false);
      fetchData();
    }
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Habari, Dr. {user?.user_metadata?.first_name}</h1>
          <p className="text-xs text-muted-foreground">Dashboard yako</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Online</span>
          <Switch checked={isOnline} onCheckedChange={handleOnlineToggle} />
          <Badge variant={isOnline ? 'default' : 'secondary'} className="text-[10px]">
            {isOnline ? 'Mtandaoni' : 'Nje'}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Leo', value: stats.today, icon: Users, color: 'text-blue-500' },
          { label: 'Inasubiri', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Imekamilika', value: stats.completed, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Rating', value: stats.rating.toFixed(1), icon: Activity, color: 'text-purple-500' },
        ].map((s, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Requests with Accept/Decline */}
      {pendingAppointments.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Maombi ya Miadi ({pendingAppointments.length})
            </h3>
            <div className="space-y-3">
              {pendingAppointments.map((apt) => (
                <div key={apt.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={apt.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary/10">
                        {apt.profiles?.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {apt.profiles?.first_name} {apt.profiles?.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(apt.appointment_date).toLocaleDateString('sw-TZ')}
                        <span>•</span>
                        {new Date(apt.appointment_date).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                        {apt.consultation_type === 'video' ? (
                          <><Video className="h-3 w-3" /> Video</>
                        ) : (
                          <><Phone className="h-3 w-3" /> Simu</>
                        )}
                      </div>
                      {apt.symptoms && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {apt.symptoms}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Accept/Decline Buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-8 text-xs text-destructive border-destructive/50 hover:bg-destructive/10" 
                      onClick={() => openDeclineDialog(apt)}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Kataa
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleAccept(apt)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Kubali
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Leo ({todayAppointments.length})
          </h3>
          {todayAppointments.length > 0 ? (
            <div className="space-y-2">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={apt.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {apt.profiles?.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {apt.profiles?.first_name} {apt.profiles?.last_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(apt.appointment_date).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px]">
                    {apt.status}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => navigate(`/messages?patient=${apt.patient_id}`)}>
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-4">Hakuna miadi leo</p>
          )}
        </CardContent>
      </Card>

      {/* Content Upload Section */}
      <ContentUploadSection
        institutionType="doctor"
        contents={contents}
        onRefresh={fetchData}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/appointments')}>
          <Calendar className="h-4 w-4" />
          <span className="text-[10px]">Miadi</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/patients')}>
          <Users className="h-4 w-4" />
          <span className="text-[10px]">Wagonjwa</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/messages')}>
          <MessageCircle className="h-4 w-4" />
          <span className="text-[10px]">Ujumbe</span>
        </Button>
      </div>

      {/* Decline Dialog with Reason */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Kataa Miadi</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedAppointment && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">
                  {selectedAppointment.profiles?.first_name} {selectedAppointment.profiles?.last_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(selectedAppointment.appointment_date).toLocaleString('sw-TZ')}
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">Sababu ya Kukataa *</Label>
              <Textarea 
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Eleza sababu (mfano: Nina mgonjwa mwingine wakati huu, Sitapatikana siku hiyo...)"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-medium mb-2">Pendekeza Wakati Mwingine (hiari)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tarehe</Label>
                  <Input 
                    type="date" 
                    value={suggestedDate}
                    onChange={(e) => setSuggestedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Saa</Label>
                  <Input 
                    type="time" 
                    value={suggestedTime}
                    onChange={(e) => setSuggestedTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setDeclineDialogOpen(false)}
                disabled={isProcessing}
              >
                Ghairi
              </Button>
              <Button 
                className="flex-1 bg-destructive hover:bg-destructive/90"
                onClick={handleDecline}
                disabled={isProcessing || !declineReason.trim()}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kataa Miadi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Drawer */}
      <SettingsDrawer 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        userRole="doctor" 
      />
    </div>
  );
}
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar, 
  MessageCircle, 
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openAppointments, setOpenAppointments] = useState(false);
  const [openProblems, setOpenProblems] = useState(true);

  // Fetch patient details
  const { data: patient } = useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });

  // Fetch patient problems
  const { data: problems = [] } = useQuery({
    queryKey: ['patient-problems', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('patient_problems')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['patient-appointments', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Imeidhinishwa';
      case 'cancelled':
        return 'Imeghairiwa';
      case 'completed':
        return 'Imekamilika';
      case 'pending':
        return 'Inasubiri';
      case 'scheduled':
        return 'Imepangwa';
      default:
        return status;
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inapakia maelezo ya mgonjwa...</p>
        </div>
      </div>
    );
  }

  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Mgonjwa';
  const activeProblems = problems.filter(p => p.status === 'open' || p.status === 'in_progress');
  const recentAppointments = appointments.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            Maelezo ya Mgonjwa
          </h1>
        </div>

        {/* Patient Info Card - Mobile Optimized */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <Avatar className="w-20 h-20 mx-auto">
                <AvatarImage src={patient.avatar_url} />
                <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xl font-semibold">
                  {patient.first_name?.[0]}{patient.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {patientName}
                </h2>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="w-3 h-3 text-blue-500" />
                    <span className="text-gray-600 text-xs truncate">{patient.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="w-3 h-3 text-green-500" />
                    <span className="text-gray-600 text-xs">
                      Amesajiliwa: {format(new Date(patient.created_at), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  
                  {patient.phone && (
                    <div className="flex items-center justify-center space-x-2">
                      <Phone className="w-3 h-3 text-purple-500" />
                      <span className="text-gray-600 text-xs">{patient.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center mt-3">
                  <Button 
                    onClick={() => navigate(`/messages?patient=${patient.id}`)}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-xs">Ujumbe</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Problems */}
        <Collapsible open={openProblems} onOpenChange={setOpenProblems}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <span>Matatizo ({activeProblems.length})</span>
                  </CardTitle>
                  {openProblems ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {activeProblems.length > 0 ? (
                  <div className="space-y-4">
                    {activeProblems.map((problem) => (
                      <div key={problem.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={getUrgencyColor(problem.urgency_level)}>
                              {problem.urgency_level}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(problem.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Nisaidie
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => navigate(`/messages?patient=${patient.id}`)}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Ujumbe
                            </Button>
                          </div>
                        </div>
                        
                        <h4 className="font-medium mb-1">{problem.category}</h4>
                        <p className="text-sm text-muted-foreground">
                          {problem.problem_text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Hakuna matatizo ya haraka kwa sasa
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Recent Appointments */}
        <Collapsible open={openAppointments} onOpenChange={setOpenAppointments}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span>Miadi ya Hivi Karibuni ({recentAppointments.length})</span>
                  </CardTitle>
                  {openAppointments ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {recentAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {recentAppointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={getStatusColor(appointment.status)}>
                                {getStatusText(appointment.status)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(appointment.appointment_date), 'dd/MM/yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{appointment.consultation_type}</p>
                            {appointment.symptoms && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Matatizo: {appointment.symptoms}
                              </p>
                            )}
                            {appointment.notes && (
                              <p className="text-sm text-muted-foreground">
                                Maelezo: {appointment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Hakuna miadi iliyorekodiwa
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        
      </div>
    </div>
  );
}
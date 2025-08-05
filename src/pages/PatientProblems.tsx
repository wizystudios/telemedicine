import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertCircle, 
  Clock, 
  User, 
  MessageCircle,
  CheckCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function PatientProblems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: problems = [], isLoading } = useQuery({
    queryKey: ['patient-problems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_problems')
        .select(`
          *,
          patient:profiles!patient_problems_patient_id_fkey(
            id, first_name, last_name, avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient problems:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const helpPatientMutation = useMutation({
    mutationFn: async (problemId: string) => {
      const { error } = await supabase
        .from('patient_problems')
        .update({ 
          resolved_by: user?.id,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', problemId);

      if (error) throw error;

      // Create notification for patient
      const problem = problems.find(p => p.id === problemId);
      if (problem) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: problem.patient_id,
            type: 'doctor_response',
            title: 'Daktari Anakusaidia',
            message: `Daktari anajibu tatizo lako. Unaweza kuanzisha mazungumzo naye.`,
            related_id: problemId
          });

        if (notificationError) {
          console.error('Failed to create notification:', notificationError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-problems'] });
      toast({
        title: 'Imefanikiwa',
        description: 'Mgonjwa amepokea ujumbe. Unaweza kuanzisha mazungumzo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hitilafu',
        description: error.message || 'Imeshindwa kusaidia mgonjwa',
        variant: 'destructive'
      });
    }
  });

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'normal':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyText = (level: string) => {
    switch (level) {
      case 'low':
        return 'Kawaida';
      case 'normal':
        return 'Wastani';
      case 'high':
        return 'Haraka';
      case 'urgent':
        return 'Dharura';
      default:
        return level;
    }
  };

  const handleHelpPatient = (problemId: string, patientId: string) => {
    helpPatientMutation.mutate(problemId);
    
    // Navigate to messages after a brief delay
    setTimeout(() => {
      navigate(`/messages?patient=${patientId}`);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Inapakia matatizo ya wagonjwa...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            Msaada
          </h1>
          <Button size="sm" variant="outline" className="text-xs">
            Onyesha Zaidi
          </Button>
        </div>

        {/* Problems List - Show Limited with Dropdown */}
        <div className="space-y-3">
          {problems
            .filter(problem => problem.status === 'open' || problem.status === 'in_progress')
            .slice(0, 2)
            .map((problem) => {
              const patient = problem.patient;
              const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Mgonjwa';
              
              return (
                <Card key={problem.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={patient?.avatar_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {patient?.first_name?.[0]}{patient?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {(problem.urgency_level === 'urgent' || problem.urgency_level === 'high') && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-background z-10"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-sm">
                              {patientName}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(problem.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                              <Badge variant="outline" className={`text-xs ${getUrgencyColor(problem.urgency_level)}`}>
                                {getUrgencyText(problem.urgency_level)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {problem.category}
                            </p>
                          </div>
                          
                          <div className="flex flex-col space-y-1 ml-2">
                            {problem.status === 'open' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleHelpPatient(problem.id, problem.patient_id)}
                                className="text-xs h-7 px-2"
                                disabled={helpPatientMutation.isPending}
                              >
                                Nisaidie
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/messages?patient=${problem.patient_id}`)}
                              className="text-xs h-7 px-2"
                            >
                              Ujumbe
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-xs font-medium text-foreground mb-1">Tatizo:</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {problem.problem_text}
                          </p>
                        </div>
                        
                        {problem.status === 'in_progress' && problem.resolved_by === user?.id && (
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2">
                            <p className="text-primary text-xs">
                              ✓ Umejibu tatizo hili. Endelea na mazungumzo.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {problems.filter(p => p.status === 'open' || p.status === 'in_progress').length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Hakuna matatizo ya wagonjwa kwa sasa
            </h3>
            <p className="text-sm text-muted-foreground">
              Matatizo ya wagonjwa yataonekana hapa wakati wanahitaji msaada
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
}
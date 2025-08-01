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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Matatizo ya Wagonjwa
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Wagonjwa wanahitaji msaada wako
            </p>
          </div>
        </div>

        {/* Problems List */}
        <div className="space-y-4">
          {problems
            .filter(problem => problem.status === 'open' || problem.status === 'in_progress')
            .map((problem) => {
              const patient = problem.patient;
              const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Mgonjwa';
              
              return (
                <Card key={problem.id} className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={patient?.avatar_url} />
                          <AvatarFallback>
                            {patient?.first_name?.[0]}{patient?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {patientName}
                            </h3>
                            <Badge className={getUrgencyColor(problem.urgency_level)}>
                              {getUrgencyText(problem.urgency_level)}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(problem.created_at), 'dd/MM/yyyy HH:mm')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="w-4 h-4" />
                              <span className="capitalize">{problem.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {problem.status === 'open' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleHelpPatient(problem.id, problem.patient_id)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={helpPatientMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Nisaidie
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/messages?patient=${problem.patient_id}`)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Ujumbe
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Tatizo:</p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {problem.problem_text}
                        </p>
                      </div>
                      
                      {problem.status === 'in_progress' && problem.resolved_by === user?.id && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                          <p className="text-blue-800 dark:text-blue-200 text-sm">
                            ✓ Umejibu tatizo hili. Endelea na mazungumzo ili kumsaidia mgonjwa.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {problems.filter(p => p.status === 'open' || p.status === 'in_progress').length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Hakuna matatizo ya wagonjwa
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Matatizo ya wagonjwa yataonekana hapa wakati wanahitaji msaada
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
}
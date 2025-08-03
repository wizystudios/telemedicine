import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Image as ImageIcon, Video, FileText, X, AlertTriangle, Send } from 'lucide-react';

export function PatientProblemPost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [problemText, setProblemText] = useState('');
  const [category, setCategory] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [attachments, setAttachments] = useState<File[]>([]);

  const categories = ['Maumivu ya Kichwa', 'Homa', 'Kikohozi', 'Maumivu ya Tumbo', 'Mengineyo'];

  const postProblemMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('patient_problems')
        .insert({
          patient_id: user?.id,
          problem_text: problemText.trim(),
          category,
          urgency_level: urgencyLevel,
          status: 'open'
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Imefanikiwa', description: 'Tatizo lako limewekwa. Madaktari watapokea arifa.' });
      setProblemText('');
      setCategory('');
      setUrgencyLevel('normal');
      queryClient.invalidateQueries({ queryKey: ['patient-problems'] });
    }
  });

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <span>Weka Tatizo Lako la Kiafya</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="Eleza tatizo lako..."
          className="min-h-[120px]"
        />
        
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Chagua aina ya tatizo" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => postProblemMutation.mutate()}
          disabled={!problemText.trim() || !category}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Tuma Tatizo
        </Button>
      </CardContent>
    </Card>
  );
}
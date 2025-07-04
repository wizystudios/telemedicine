
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function PatientProblemPost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPosting, setIsPosting] = useState(false);
  const [problemText, setProblemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    { id: 'maumivu', label: 'Maumivu', icon: '😣' },
    { id: 'homa', label: 'Homa', icon: '🤒' },
    { id: 'kukohoa', label: 'Kukohoa', icon: '😷' },
    { id: 'tumbo', label: 'Matatizo ya Tumbo', icon: '🤢' },
    { id: 'kichwa', label: 'Maumivu ya Kichwa', icon: '🤕' },
    { id: 'mingine', label: 'Mengine', icon: '🏥' }
  ];

  const urgencyLevels = [
    { id: 'low', label: 'Kawaida', color: 'bg-green-500', description: 'Si haraka' },
    { id: 'normal', label: 'Wastani', color: 'bg-yellow-500', description: 'Unahitaji msaada' },
    { id: 'high', label: 'Haraka', color: 'bg-orange-500', description: 'Unahitaji msaada haraka' },
    { id: 'urgent', label: 'Dharura', color: 'bg-red-500', description: 'Hatari!' }
  ];

  const handleSubmitProblem = async () => {
    if (!problemText.trim() || !selectedCategory) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza maelezo na chagua kategoria',
        variant: 'destructive'
      });
      return;
    }

    setIsPosting(true);
    try {
      // Insert patient problem directly
      const { data: problemData, error: problemError } = await supabase
        .from('patient_problems')
        .insert({
          patient_id: user?.id,
          problem_text: problemText,
          category: selectedCategory,
          urgency_level: urgencyLevel,
          status: 'open'
        })
        .select()
        .single();

      if (problemError) throw problemError;

      // Create notifications for all online doctors
      const { data: doctors } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'doctor');

      if (doctors && doctors.length > 0) {
        const notifications = doctors.map(doctor => ({
          user_id: doctor.id,
          title: 'Mgonjwa Anahitaji Msaada',
          message: `Mgonjwa anahitaji msaada: ${problemText.substring(0, 100)}...`,
          type: 'patient_problem',
          related_id: problemData.id
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }

      toast({
        title: 'Imefanikiwa',
        description: 'Tatizo lako limetumwa kwa madaktari. Utapokea msaada hivi karibuni.',
      });

      setProblemText('');
      setSelectedCategory('');
      setUrgencyLevel('normal');
      setIsOpen(false);

    } catch (error: any) {
      console.error('Error submitting problem:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma tatizo. Jaribu tena.',
        variant: 'destructive'
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span>Una Tatizo la Kiafya?</span>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="problem">Eleza Tatizo Lako</Label>
              <Textarea
                id="problem"
                placeholder="Eleza tatizo lako kwa ufupi. Ni nini kinakusumbua? Tangu lini? Ni kali kipi?"
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Chagua Kategoria</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="justify-start"
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Kiwango cha Haraka</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {urgencyLevels.map((level) => (
                  <Button
                    key={level.id}
                    variant={urgencyLevel === level.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUrgencyLevel(level.id)}
                    className={`justify-start ${urgencyLevel === level.id ? level.color : ''}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${level.color} mr-2`}></div>
                    <div className="text-left">
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs opacity-75">{level.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <div className="text-sm">
                <p className="font-medium">Kumbuka:</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Tatizo lako litaonekana na madaktari wote. Madaktari watakaoweza kukusaidia watawasiliana nawe.
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSubmitProblem}
              disabled={isPosting || !problemText.trim() || !selectedCategory}
              className="w-full"
            >
              {isPosting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Inatuma...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Tuma Ombi la Msaada
                </>
              )}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

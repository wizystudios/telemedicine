import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

const ROLES = [
  { value: 'patient', label: 'Mgonjwa (Patient)' },
  { value: 'doctor', label: 'Daktari (Doctor)' },
  { value: 'hospital_owner', label: 'Mmiliki wa Hospitali' },
  { value: 'pharmacy_owner', label: 'Mmiliki wa Duka la Dawa' },
  { value: 'lab_owner', label: 'Mmiliki wa Maabara' },
  { value: 'admin', label: 'Admin' },
] as const;

export default function RegisterUserForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('patient');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // 2. Assign role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ user_id: authData.user.id, role: role as any }]);

      if (roleError) throw roleError;

      // 3. Update profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: role as any,
          first_name: firstName,
          last_name: lastName,
          phone
        })
        .eq('id', authData.user.id);

      if (profileError) console.error('Profile update error:', profileError);

      toast({
        title: 'Imefanikiwa!',
        description: `${firstName} ${lastName} amesajiliwa kama ${ROLES.find(r => r.value === role)?.label}`,
      });

      // Reset form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setRole('patient');
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Hitilafu',
        description: error.message || 'Imeshindwa kusajili mtumiaji',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Sajili Mtumiaji Mpya
        </CardTitle>
        <CardDescription>
          Sajili mtumiaji yeyote na chagua jukumu lake
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Jina la Kwanza *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Jina la Ukoo *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="phone">Simu</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 XXX XXX XXX"
            />
          </div>

          <div>
            <Label htmlFor="role">Jukumu (Role) *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Chagua jukumu" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Inasajili...' : 'Sajili Mtumiaji'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

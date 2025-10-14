import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope } from 'lucide-react';

export default function RegisterDoctorForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor details
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [doctorType, setDoctorType] = useState<string>('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create doctor auth account
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

      // 2. Assign doctor role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ user_id: authData.user.id, role: 'doctor' } as any]);

      if (roleError) throw roleError;

      // 3. Create doctor profile
      const { error: profileError } = await supabase
        .from('doctor_profiles')
        .insert([{
          user_id: authData.user.id,
          license_number: licenseNumber,
          bio,
          experience_years: experienceYears ? parseInt(experienceYears) : 0,
          consultation_fee: consultationFee ? parseFloat(consultationFee) : 0,
          doctor_type: doctorType,
          is_private: true, // Private doctor
          is_verified: false,
        }]);

      if (profileError) throw profileError;

      toast({
        title: 'Success!',
        description: 'Doctor registered successfully. They will receive verification email.',
      });

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error registering doctor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register doctor',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setLicenseNumber('');
    setBio('');
    setExperienceYears('');
    setConsultationFee('');
    setDoctorType('general');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Register Private Doctor
        </CardTitle>
        <CardDescription>
          Register a private doctor (not affiliated with any hospital)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
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
              placeholder="doctor@example.com"
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
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 XXX XXX XXX"
              required
            />
          </div>

          <div>
            <Label htmlFor="licenseNumber">License Number *</Label>
            <Input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Medical License Number"
              required
            />
          </div>

          <div>
            <Label htmlFor="doctorType">Doctor Type *</Label>
            <Select value={doctorType} onValueChange={setDoctorType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Doctor</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="experienceYears">Years of Experience</Label>
              <Input
                id="experienceYears"
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <Label htmlFor="consultationFee">Consultation Fee (TZS)</Label>
              <Input
                id="consultationFee"
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio / Specialization</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Doctor's bio, specialization, and experience..."
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Registering...' : 'Register Doctor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

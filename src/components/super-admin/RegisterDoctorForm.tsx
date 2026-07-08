import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, ClipboardCheck, LogIn, ShieldCheck, Stethoscope } from 'lucide-react';
import { adminCreate } from '@/lib/adminCreate';

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
  const [autoApprove, setAutoApprove] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await adminCreate('create_doctor', {
        email,
        password,
        firstName,
        lastName,
        phone,
        licenseNumber,
        bio,
        experienceYears,
        consultationFee,
        doctorType,
        autoApprove,
      });

      toast({
        title: 'Daktari amesajiliwa!',
        description: autoApprove ? 'Akaunti iko tayari kuingia kwenye dashboard.' : 'Akaunti imetengenezwa; ithibitishe kabla ionekane kwa wagonjwa.',
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
    setAutoApprove(false);
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
        <div className="mb-5 grid gap-2 rounded-2xl border border-border bg-muted/30 p-3">
          {[
            { icon: ClipboardCheck, text: '1. Sajili akaunti ya daktari na namba ya leseni.' },
            { icon: ShieldCheck, text: '2. Admin athibitishe leseni au uchague “thibitisha sasa”.' },
            { icon: LogIn, text: '3. Daktari aingie; ataona onboarding na dashboard yake.' },
            { icon: CheckCircle2, text: '4. Baada ya approval, wagonjwa wataweza kumuona na kuweka miadi.' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span>{text}</span>
            </div>
          ))}
        </div>
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

          <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Thibitisha daktari sasa</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <AlertCircle className="h-3 w-3" /> Usitumie bila kukagua leseni.
              </p>
            </div>
          </label>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Inasajili...' : 'Sajili Daktari'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

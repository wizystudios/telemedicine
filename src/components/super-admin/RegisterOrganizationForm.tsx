import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building, Pill, TestTube, Hospital, User } from 'lucide-react';

export default function RegisterOrganizationForm() {
  const { toast } = useToast();
  const [orgType, setOrgType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Owner credentials
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create owner account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: ownerPassword,
        options: {
          data: {
            first_name: ownerFirstName,
            last_name: ownerLastName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // 2. Assign role based on organization type
      let role = '';
      switch (orgType) {
        case 'hospital':
          role = 'hospital_owner';
          break;
        case 'pharmacy':
          role = 'pharmacy_owner';
          break;
        case 'lab':
          role = 'lab_owner';
          break;
        case 'polyclinic':
          role = 'polyclinic_owner';
          break;
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ user_id: authData.user.id, role: role } as any]);

      if (roleError) throw roleError;

      // 3. Create organization record
      if (orgType === 'hospital' || orgType === 'polyclinic') {
        const orgData = {
          owner_id: authData.user.id,
          name,
          description,
          address,
          phone,
          email,
          website: website || null,
          is_verified: false,
        };

        const { error: orgError } = await supabase
          .from('hospitals')
          .insert([orgData]);

        if (orgError) throw orgError;
      } else if (orgType === 'pharmacy') {
        const orgData = {
          owner_id: authData.user.id,
          name,
          description,
          address,
          phone,
          email,
          is_verified: false,
        };

        const { error: orgError } = await supabase
          .from('pharmacies')
          .insert([orgData]);

        if (orgError) throw orgError;
      } else if (orgType === 'lab') {
        const orgData = {
          owner_id: authData.user.id,
          name,
          description,
          address,
          phone,
          email,
          is_verified: false,
        };

        const { error: orgError } = await supabase
          .from('laboratories')
          .insert([orgData]);

        if (orgError) throw orgError;
      }

      toast({
        title: 'Success!',
        description: `${orgType} registered successfully. Owner will receive verification email.`,
      });

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error registering organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register organization',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setOrgType('');
    setName('');
    setDescription('');
    setAddress('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setOwnerEmail('');
    setOwnerPassword('');
    setOwnerFirstName('');
    setOwnerLastName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Organization</CardTitle>
        <CardDescription>
          Register a new hospital, pharmacy, lab, or polyclinic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Type */}
          <div>
            <Label>Organization Type *</Label>
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hospital">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Hospital
                  </div>
                </SelectItem>
                <SelectItem value="pharmacy">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Pharmacy
                  </div>
                </SelectItem>
                <SelectItem value="lab">
                  <div className="flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Laboratory
                  </div>
                </SelectItem>
                <SelectItem value="polyclinic">
                  <div className="flex items-center gap-2">
                    <Hospital className="w-4 h-4" />
                    Polyclinic
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orgType && (
            <>
              {/* Organization Details */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Organization Details</h3>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Enter ${orgType} name`}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of services..."
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full address"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Owner Credentials */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Owner Account Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ownerFirstName">First Name *</Label>
                    <Input
                      id="ownerFirstName"
                      value={ownerFirstName}
                      onChange={(e) => setOwnerFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerLastName">Last Name *</Label>
                    <Input
                      id="ownerLastName"
                      value={ownerLastName}
                      onChange={(e) => setOwnerLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Owner Email *</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPassword">Password *</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Registering...' : `Register ${orgType}`}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

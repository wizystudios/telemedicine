import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building, Pill, TestTube, Hospital, User, Upload, MapPin, FileSpreadsheet, X, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { adminCreate, fileToAdminUpload } from '@/lib/adminCreate';

export default function RegisterOrganizationForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const [orgType, setOrgType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Compliance docs (BRELA / TIN / license) — MANDATORY
  const [brelaNumber, setBrelaNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Organization details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);

  // Location
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Owner credentials
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');

  // Bulk import
  const [csvData, setCsvData] = useState<any[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          toast({
            title: 'Eneo limepatikana',
            description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
          });
        },
        (error) => {
          toast({
            title: 'Imeshindwa kupata eneo',
            description: 'Tafadhali weka eneo manually',
            variant: 'destructive'
          });
        }
      );
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index]?.trim() || '';
          });
          return obj;
        });
        
        setCsvData(data);
        toast({
          title: 'CSV imepakuliwa',
          description: `Rekodi ${data.length} zimepatikana`
        });
      };
      reader.readAsText(file);
    }
  };

  const validateStrongPassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Nenosiri lazima liwe na herufi 8+';
    if (!/[A-Z]/.test(pw)) return 'Nenosiri lazima liwe na herufi 1 KUBWA';
    if (!/[0-9]/.test(pw)) return 'Nenosiri lazima liwe na namba 1';
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\]/.test(pw)) return 'Nenosiri lazima liwe na alama 1 maalum';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validateStrongPassword(ownerPassword);
    if (pwError) {
      toast({ title: 'Nenosiri dhaifu', description: pwError, variant: 'destructive' });
      return;
    }
    if (!brelaNumber.trim()) {
      toast({ title: 'Namba ya BRELA inahitajika', variant: 'destructive' });
      return;
    }
    if (!licenseFile) {
      toast({ title: 'Hati ya leseni inahitajika', description: 'Pakia hati ya leseni ya BRELA / TIN', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      await adminCreate('create_organization', {
        orgType,
        name,
        description,
        address,
        orgPhone: phone,
        orgEmail: email,
        website,
        latitude,
        longitude,
        brelaNumber,
        tinNumber,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName,
        autoApprove,
        logoFile: await fileToAdminUpload(logoFile),
        licenseFile: await fileToAdminUpload(licenseFile),
      });

      toast({
        title: 'Imefanikiwa!',
        description: autoApprove ? `${orgType} imesajiliwa na kuidhinishwa.` : `${orgType} imesajiliwa. Inasubiri uthibitisho.`,
      });

      resetForm();
    } catch (error: any) {
      console.error('Error registering organization:', error);
      toast({ title: 'Kosa', description: error.message || 'Imeshindwa kusajili shirika', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) return;
    
    setIsSubmitting(true);
    let successCount = 0;
    
    for (const row of csvData) {
      try {
        await adminCreate('create_organization', {
          orgType: row.type?.toLowerCase() || 'hospital',
          name: row.name || row.org_name,
          description: row.description || '',
          address: row.address || '—',
          orgPhone: row.phone || '',
          orgEmail: row.email || row.owner_email || '',
          ownerEmail: row.owner_email || row.email,
          ownerPassword: row.password || 'TeleMed2026!',
          ownerFirstName: row.first_name || row.name?.split(' ')[0] || '',
          ownerLastName: row.last_name || row.name?.split(' ')[1] || '',
          brelaNumber: row.brela_number || null,
          tinNumber: row.tin_number || null,
          autoApprove: false,
        });
        successCount++;
      } catch (err) {
        console.error('Bulk import row error:', err);
      }
    }

    toast({
      title: 'Uagizaji umekamilika',
      description: `Mashirika ${successCount}/${csvData.length} yamesajiliwa`
    });
    
    setCsvData([]);
    setIsSubmitting(false);
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
    setLogoFile(null);
    setLogoPreview('');
    setLatitude('');
    setLongitude('');
    setBrelaNumber('');
    setTinNumber('');
    setLicenseFile(null);
  };

  return (
    <div className="space-y-4">
      {/* Bulk Import Section */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Uagizaji wa Wingi (CSV)
              </CardTitle>
              <CardDescription className="text-xs">
                Agiza mashirika mengi kwa wakati mmoja
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowBulkImport(!showBulkImport)}
            >
              {showBulkImport ? 'Ficha' : 'Onyesha'}
            </Button>
          </div>
        </CardHeader>
        
        {showBulkImport && (
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground mb-2">
              CSV inapaswa kuwa na: name, type, address, phone, email, owner_email, password
            </div>
            <div className="flex gap-2">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => csvInputRef.current?.click()}
              >
                <Upload className="h-3 w-3 mr-1" />
                Pakia CSV
              </Button>
              {csvData.length > 0 && (
                <Button size="sm" onClick={handleBulkImport} disabled={isSubmitting}>
                  <Check className="h-3 w-3 mr-1" />
                  Agiza {csvData.length}
                </Button>
              )}
            </div>
            {csvData.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {csvData.slice(0, 3).map((row, i) => (
                  <div key={i} className="truncate">{row.name} - {row.type}</div>
                ))}
                {csvData.length > 3 && <div>...na {csvData.length - 3} zaidi</div>}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Single Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sajili Shirika Jipya</CardTitle>
          <CardDescription className="text-xs">
            Sajili hospitali, duka la dawa, maabara, au polyclinic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Type */}
            <div>
              <Label className="text-xs">Aina ya Shirika *</Label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Chagua aina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">
                    <div className="flex items-center gap-2">
                      <Building className="w-3 h-3" />
                      Hospitali
                    </div>
                  </SelectItem>
                  <SelectItem value="pharmacy">
                    <div className="flex items-center gap-2">
                      <Pill className="w-3 h-3" />
                      Duka la Dawa
                    </div>
                  </SelectItem>
                  <SelectItem value="lab">
                    <div className="flex items-center gap-2">
                      <TestTube className="w-3 h-3" />
                      Maabara
                    </div>
                  </SelectItem>
                  <SelectItem value="polyclinic">
                    <div className="flex items-center gap-2">
                      <Hospital className="w-3 h-3" />
                      Polyclinic
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {orgType && (
              <>
                {/* Logo Upload */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-dashed border-border">
                    {logoPreview ? (
                      <AvatarImage src={logoPreview} />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <Building className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Pakia Logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG hadi 2MB</p>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="grid gap-3">
                  <div>
                    <Label className="text-xs">Jina *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`Jina la ${orgType}`}
                      className="h-9"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Maelezo</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Maelezo mafupi..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                  
                  {/* Address with Location */}
                  <div>
                    <Label className="text-xs">Anwani *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Anwani kamili"
                        className="h-9 flex-1"
                        required
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleGetLocation}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    {(latitude || longitude) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {latitude}, {longitude}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Simu *</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+255..."
                        className="h-9"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Barua pepe *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="info@..."
                        className="h-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* BRELA / TIN / License — MANDATORY */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <FileSpreadsheet className="w-3 h-3" />
                    Hati za Uthibitisho (BRELA / TIN)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Namba ya BRELA *</Label>
                      <Input
                        value={brelaNumber}
                        onChange={(e) => setBrelaNumber(e.target.value)}
                        placeholder="BRELA-..."
                        className="h-9"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">TIN (hiari)</Label>
                      <Input
                        value={tinNumber}
                        onChange={(e) => setTinNumber(e.target.value)}
                        placeholder="123-456-789"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Hati ya Leseni *</Label>
                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-2xl"
                      onClick={() => licenseInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {licenseFile ? licenseFile.name : 'Pakia hati (PDF / Picha)'}
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1">Lazima — itahakikiwa na admin</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Akaunti ya Mmiliki
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Jina la Kwanza *</Label>
                      <Input
                        value={ownerFirstName}
                        onChange={(e) => setOwnerFirstName(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Jina la Mwisho *</Label>
                      <Input
                        value={ownerLastName}
                        onChange={(e) => setOwnerLastName(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Barua pepe ya Mmiliki *</Label>
                    <Input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="mmiliki@..."
                      className="h-9"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nenosiri *</Label>
                    <Input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="8+ herufi, KUBWA, namba, alama"
                      className="h-9"
                      required
                      minLength={8}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Mfano: Telemed@2026
                    </p>
                  </div>
                </div>

                {/* Approval / Verification toggle */}
                <div className="border-t pt-4">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoApprove}
                      onChange={(e) => setAutoApprove(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {autoApprove ? '✓ Thibitisha sasa hivi' : '⏳ Sajili bila kuthibitisha'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {autoApprove
                          ? 'Shirika litaonekana kwa watumiaji mara moja.'
                          : 'Shirika halitaonekana hadi uthibitishe baadaye kwenye orodha ya mashirika.'}
                      </p>
                    </div>
                  </label>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Inasajili...' : `Sajili ${orgType}${autoApprove ? ' & Thibitisha' : ''}`}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminCreate, fileToAdminUpload } from '@/lib/adminCreate';
import {
  Building2, Loader2, MapPin, RefreshCw, ShieldCheck, Upload, UserPlus,
} from 'lucide-react';

type AccountType = 'patient' | 'admin' | 'doctor' | 'org_owner';

const ACCOUNT_TYPES: { id: AccountType; label: string; hint: string }[] = [
  { id: 'patient', label: 'Mgonjwa', hint: 'Akaunti ya kawaida' },
  { id: 'doctor', label: 'Daktari', hint: 'Binafsi au wa shirika' },
  { id: 'org_owner', label: 'Mmiliki wa shirika', hint: 'Lazima shirika liwepo' },
  { id: 'admin', label: 'Admin', hint: 'Msimamizi wa mfumo' },
];

const ORG_TYPES = [
  { value: 'hospital', label: 'Hospitali', role: 'hospital_owner' },
  { value: 'polyclinic', label: 'Polyclinic', role: 'polyclinic_owner' },
  { value: 'pharmacy', label: 'Duka la dawa', role: 'pharmacy_owner' },
  { value: 'lab', label: 'Maabara', role: 'lab_owner' },
];

interface OrgRow {
  id: string;
  name: string;
  address: string | null;
  owner_id: string | null;
  orgType: string;
}

export default function SmartCreateWizard() {
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<AccountType>('patient');
  const [submitting, setSubmitting] = useState(false);

  // shared identity fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // doctor fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [doctorType, setDoctorType] = useState('general');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [bio, setBio] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);

  // org linkage
  const [orgType, setOrgType] = useState('hospital');
  const [orgId, setOrgId] = useState('');
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [createNewOrg, setCreateNewOrg] = useState(false);

  // new organization fields
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [brelaNumber, setBrelaNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);

  const needsOrg = accountType === 'org_owner' || (accountType === 'doctor' && !!orgId) ||
    (accountType === 'doctor' && orgType !== 'private');

  const loadOrgs = useCallback(async (type: string) => {
    setLoadingOrgs(true);
    try {
      const res = await adminCreate<{ orgs: OrgRow[] }>('list_orgs', { orgType: type });
      setOrgs(res.orgs || []);
    } catch (e: any) {
      toast({ title: 'Imeshindwa kupakia mashirika', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingOrgs(false);
    }
  }, [toast]);

  useEffect(() => {
    if (accountType === 'org_owner' || accountType === 'doctor') {
      if (orgType && orgType !== 'private') loadOrgs(orgType);
    }
    setOrgId('');
  }, [accountType, orgType, loadOrgs]);

  const doctorOrgTypes = useMemo(
    () => [{ value: 'private', label: 'Daktari binafsi (hakuna shirika)' }, ...ORG_TYPES.filter(o => o.value === 'hospital' || o.value === 'polyclinic')],
    [],
  );

  const resetIdentity = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setPhone('');
    setLicenseNumber(''); setExperienceYears(''); setConsultationFee(''); setBio('');
    setAutoApprove(false); setOrgId('');
    setOrgName(''); setOrgAddress(''); setOrgPhone(''); setOrgEmail(''); setOrgWebsite('');
    setOrgDescription(''); setBrelaNumber(''); setTinNumber(''); setLatitude(''); setLongitude('');
    setLogoFile(null); setLicenseFile(null); setCreateNewOrg(false);
  };

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => { setLatitude(String(p.coords.latitude)); setLongitude(String(p.coords.longitude)); },
      () => toast({ title: 'Imeshindwa kupata eneo', variant: 'destructive' }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (accountType === 'patient' || accountType === 'admin') {
        await adminCreate('create_user', { role: accountType, firstName, lastName, email, password, phone });
        toast({ title: 'Imefanikiwa', description: `${firstName} ${lastName} amesajiliwa.` });
      }

      if (accountType === 'doctor') {
        if (orgType !== 'private' && !orgId) throw new Error('Chagua shirika lililopo au chagua "Daktari binafsi"');
        await adminCreate('create_doctor', {
          firstName, lastName, email, password, phone,
          licenseNumber, doctorType, experienceYears, consultationFee, bio, autoApprove,
          orgType: orgType === 'private' ? '' : orgType,
          orgId: orgType === 'private' ? '' : orgId,
        });
        toast({ title: 'Daktari amesajiliwa', description: autoApprove ? 'Ameidhinishwa tayari.' : 'Anasubiri idhini.' });
      }

      if (accountType === 'org_owner') {
        if (createNewOrg) {
          if (!brelaNumber.trim()) throw new Error('Namba ya BRELA inahitajika');
          if (!licenseFile) throw new Error('Pakia hati ya leseni');
          await adminCreate('create_organization', {
            orgType, name: orgName, description: orgDescription, address: orgAddress,
            orgPhone, orgEmail, website: orgWebsite, latitude, longitude,
            brelaNumber, tinNumber,
            ownerEmail: email, ownerPassword: password, ownerFirstName: firstName, ownerLastName: lastName, ownerPhone: phone,
            autoApprove,
            logoFile: await fileToAdminUpload(logoFile),
            licenseFile: await fileToAdminUpload(licenseFile),
          });
          toast({ title: 'Shirika na mmiliki vimesajiliwa' });
        } else {
          if (!orgId) throw new Error('Chagua shirika lililopo');
          const role = ORG_TYPES.find(o => o.value === orgType)!.role;
          await adminCreate('create_user', { role, firstName, lastName, email, password, phone, orgType, orgId });
          toast({ title: 'Mmiliki ameunganishwa', description: 'Akaunti imeunganishwa na shirika lililopo.' });
        }
        loadOrgs(orgType);
      }

      resetIdentity();
    } catch (err: any) {
      toast({ title: 'Hitilafu', description: err.message || 'Imeshindwa', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Account type */}
      <Card className="rounded-3xl border-0 shadow-sm p-4">
        <p className="text-sm font-semibold mb-3">Aina ya akaunti</p>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          {ACCOUNT_TYPES.map((t) => {
            const active = accountType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setAccountType(t.id); setOrgType(t.id === 'doctor' ? 'private' : 'hospital'); }}
                className={`text-left rounded-2xl p-3 border transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 bg-muted/30 hover:bg-muted/60'}`}
              >
                <p className="text-xs font-semibold">{t.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t.hint}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Identity — same for every type */}
      <Card className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Taarifa za mtumiaji</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Jina la kwanza *</Label><Input className="h-9 rounded-xl" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
          <div><Label className="text-xs">Jina la ukoo *</Label><Input className="h-9 rounded-xl" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Barua pepe *</Label><Input type="email" className="h-9 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label className="text-xs">Nenosiri *</Label><Input type="password" className="h-9 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
        </div>
        <div><Label className="text-xs">Simu {accountType === 'doctor' ? '*' : '(hiari)'}</Label>
          <Input className="h-9 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255..." required={accountType === 'doctor'} />
        </div>
      </Card>

      {/* Doctor extras */}
      {accountType === 'doctor' && (
        <Card className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold">Taarifa za kitaaluma</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Namba ya leseni *</Label><Input className="h-9 rounded-xl" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required /></div>
            <div>
              <Label className="text-xs">Aina ya daktari</Label>
              <Select value={doctorType} onValueChange={setDoctorType}>
                <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Daktari wa jumla</SelectItem>
                  <SelectItem value="specialist">Bingwa (Specialist)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Uzoefu (miaka)</Label><Input type="number" className="h-9 rounded-xl" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} /></div>
            <div><Label className="text-xs">Ada (TZS)</Label><Input type="number" className="h-9 rounded-xl" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Wasifu</Label><Textarea className="rounded-xl text-sm" value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        </Card>
      )}

      {/* Organization linkage */}
      {(accountType === 'doctor' || accountType === 'org_owner') && (
        <Card className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Shirika</p>
            {!createNewOrg && orgType !== 'private' && (
              <Button type="button" size="sm" variant="ghost" className="h-7 rounded-xl text-[11px]" onClick={() => loadOrgs(orgType)}>
                <RefreshCw className="h-3 w-3 mr-1" /> Sasisha
              </Button>
            )}
          </div>

          <div>
            <Label className="text-xs">Aina ya shirika</Label>
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(accountType === 'doctor' ? doctorOrgTypes : ORG_TYPES).map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {orgType !== 'private' && !createNewOrg && (
            <div>
              <Label className="text-xs">Chagua shirika lililopo *</Label>
              {loadingOrgs ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" /> Inapakia...</div>
              ) : orgs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Hakuna shirika la aina hii bado. {accountType === 'org_owner' ? 'Unda jipya hapa chini.' : 'Sajili shirika kwanza.'}
                </p>
              ) : (
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="Chagua shirika" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}{o.owner_id ? ' • ina mmiliki' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {orgId && orgs.find(o => o.id === orgId)?.owner_id && accountType === 'org_owner' && (
                <p className="text-[11px] text-amber-600 mt-1">Shirika hili tayari lina mmiliki — kuendelea kutabadilisha umiliki.</p>
              )}
            </div>
          )}

          {accountType === 'org_owner' && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={createNewOrg} onChange={(e) => setCreateNewOrg(e.target.checked)} />
              Shirika halipo — unda shirika jipya pamoja na mmiliki huyu
            </label>
          )}

          {accountType === 'org_owner' && createNewOrg && (
            <div className="space-y-3 border-t border-border/60 pt-3">
              <div><Label className="text-xs">Jina la shirika *</Label><Input className="h-9 rounded-xl" value={orgName} onChange={(e) => setOrgName(e.target.value)} required /></div>
              <div><Label className="text-xs">Maelezo</Label><Textarea className="rounded-xl text-sm" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Anwani *</Label>
                <div className="flex gap-2">
                  <Input className="h-9 rounded-xl flex-1" value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} required />
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={getLocation}><MapPin className="h-4 w-4" /></Button>
                </div>
                {latitude && <p className="text-[10px] text-muted-foreground mt-1">📍 {latitude}, {longitude}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Simu ya shirika *</Label><Input className="h-9 rounded-xl" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} required /></div>
                <div><Label className="text-xs">Barua pepe ya shirika *</Label><Input type="email" className="h-9 rounded-xl" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} required /></div>
              </div>
              <div><Label className="text-xs">Tovuti</Label><Input className="h-9 rounded-xl" value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Namba ya BRELA *</Label><Input className="h-9 rounded-xl" value={brelaNumber} onChange={(e) => setBrelaNumber(e.target.value)} required /></div>
                <div><Label className="text-xs">TIN</Label><Input className="h-9 rounded-xl" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />{logoFile ? logoFile.name.slice(0, 18) : 'Pakia logo'}
                </Button>
                <input ref={licenseRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => licenseRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />{licenseFile ? licenseFile.name.slice(0, 18) : 'Pakia leseni *'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {(accountType === 'doctor' || accountType === 'org_owner') && (
        <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Thibitisha sasa</p>
            <p className="text-[11px] text-muted-foreground">Tumia tu ikiwa umekagua leseni na hati halisi.</p>
          </div>
        </label>
      )}

      <Button type="submit" disabled={submitting} className="w-full rounded-2xl h-11">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sajili'}
      </Button>
    </form>
  );
}

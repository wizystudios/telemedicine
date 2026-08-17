import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Building2, Stethoscope, UserPlus, ChevronRight } from 'lucide-react';
import RegisterUserForm from '@/components/super-admin/RegisterUserForm';
import RegisterDoctorForm from '@/components/super-admin/RegisterDoctorForm';
import RegisterOrganizationForm from '@/components/super-admin/RegisterOrganizationForm';

type Path = 'user' | 'doctor' | 'org';

const PATHS: { id: Path; label: string; hint: string; icon: any }[] = [
  { id: 'user', label: 'Mtumiaji', hint: 'Mgonjwa, admin au mmiliki bila shirika', icon: UserPlus },
  { id: 'doctor', label: 'Daktari', hint: 'Binafsi au wa hospitali / polyclinic', icon: Stethoscope },
  { id: 'org', label: 'Shirika + mmiliki', hint: 'Hospitali, polyclinic, famasi au maabara', icon: Building2 },
];

export default function SmartCreateWizard() {
  const [path, setPath] = useState<Path>('user');

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-0 shadow-sm p-4">
        <p className="text-sm font-semibold mb-3">Nataka kusajili nini?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PATHS.map((p) => {
            const active = path === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPath(p.id)}
                className={`text-left rounded-2xl p-3 border transition-all ${
                  active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 bg-muted/30 hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${active ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground'}`}>
                    <p.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{p.hint}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {path === 'user' && <RegisterUserForm />}
      {path === 'doctor' && <RegisterDoctorForm />}
      {path === 'org' && <RegisterOrganizationForm />}
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DoctorCardProps {
  doctor: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    specialization?: string;
  };
  isOnline?: boolean;
  hasPatientProblem?: boolean;
}

export function DoctorCard({ doctor, isOnline = false, hasPatientProblem = false }: DoctorCardProps) {
  const navigate = useNavigate();
  const name = `Dk. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 border border-border">
            <AvatarImage src={doctor.avatar_url} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {doctor.first_name?.[0]}{doctor.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
          )}
          {hasPatientProblem && (
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-2 border-background animate-pulse" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {isOnline && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Sasa</Badge>}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {doctor.specialization || 'Daktari'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => navigate(`/doctor-profile/${doctor.id}`)}>
          Tazama
        </Button>
        <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => navigate(`/messages?doctor=${doctor.id}`)}>
          Ujumbe
        </Button>
      </div>
    </div>
  );
}

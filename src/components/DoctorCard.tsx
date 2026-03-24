import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    <button
      className="flex-shrink-0 w-16 flex flex-col items-center gap-1"
      onClick={() => navigate(`/doctor-profile/${doctor.id}`)}
    >
      <div className="relative">
        <Avatar className="h-11 w-11 border-2 border-border">
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
      <span className="text-[10px] font-medium text-foreground truncate w-full text-center leading-tight">
        {name}
      </span>
      {doctor.specialization && (
        <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight -mt-0.5">
          {doctor.specialization}
        </span>
      )}
    </button>
  );
}


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  email: string;
  phone?: string;
  country?: string;
  created_at: string;
  specialization?: string;
  hospital?: string;
  experience_years?: number;
  consultation_fee?: number;
  bio?: string;
  education?: string;
}

interface DoctorCardProps {
  doctor: Doctor;
  isOnline?: boolean;
  hasPatientProblem?: boolean;
}

export function DoctorCard({ doctor, isOnline = false, hasPatientProblem = false }: DoctorCardProps) {
  const navigate = useNavigate();
  
  const displayName = `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Daktari';

  const handleProfileClick = () => {
    navigate(`/doctor-profile/${doctor.id}`);
  };
  
  return (
    <div className="flex-shrink-0 w-16 cursor-pointer" onClick={handleProfileClick}>
      <div className="flex flex-col items-center space-y-1">
        <div className="relative">
          <Avatar className="w-12 h-12 ring-2 ring-emerald-200 dark:ring-emerald-800 border-2 border-white dark:border-gray-800">
            {doctor.avatar_url ? (
              <AvatarImage 
                src={doctor.avatar_url} 
                alt={displayName}
                className="object-cover w-full h-full rounded-full"
              />
            ) : null}
            <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              {doctor.first_name?.[0] || 'D'}{doctor.last_name?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          {hasPatientProblem && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse z-10"></div>
          )}
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          )}
        </div>
        
        <div className="text-center w-full">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate leading-tight">
            {displayName}
          </h3>
          {doctor.specialization && (
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate leading-tight">
              {doctor.specialization}
            </p>
          )}
          <div className="flex justify-center items-center gap-1 mt-1">
            {isOnline && (
              <Badge variant="default" className="text-xs bg-green-500 dark:bg-green-600 px-1 py-0 h-4">
                Online
              </Badge>
            )}
            {hasPatientProblem && (
              <Badge variant="destructive" className="text-xs animate-pulse px-1 py-0 h-4">
                Msaada
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

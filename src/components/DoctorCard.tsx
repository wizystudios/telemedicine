
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700 relative cursor-pointer" onClick={handleProfileClick}>
      {hasPatientProblem && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-4 border-white dark:border-gray-800 rounded-full animate-pulse z-10"></div>
      )}
      
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="w-20 h-20 ring-2 ring-emerald-200 dark:ring-emerald-800">
              {doctor.avatar_url ? (
                <AvatarImage 
                  src={doctor.avatar_url} 
                  alt={displayName}
                />
              ) : null}
              <AvatarFallback className="text-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                {doctor.first_name?.[0] || 'D'}{doctor.last_name?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
          </div>
          
          <div className="text-center w-full">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-emerald-600">
              {displayName}
            </h3>
            {doctor.specialization && (
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {doctor.specialization}
              </p>
            )}
            <div className="flex justify-center items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-200">
                Daktari
              </Badge>
              {isOnline && (
                <Badge variant="default" className="text-xs bg-green-500 dark:bg-green-600">
                  Online
                </Badge>
              )}
              {hasPatientProblem && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  Anahitaji Msaada
                </Badge>
              )}
            </div>
            {doctor.country && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center">
                <MapPin className="w-3 h-3 mr-1" />
                {doctor.country}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

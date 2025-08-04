
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, MessageCircle, Phone, Video, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  email: string;
  phone?: string;
  country?: string;
  created_at: string;
}

interface PatientCardProps {
  patient: Patient;
  hasUrgentProblem?: boolean;
}

export function PatientCard({ patient, hasUrgentProblem = false }: PatientCardProps) {
  const navigate = useNavigate();
  
  const displayName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Mgonjwa';

  const handleProfileClick = () => {
    navigate(`/patient/${patient.id}`);
  };

  const handleMessage = () => {
    navigate(`/messages?patient=${patient.id}`);
  };

  const handleCall = () => {
    // Implement call functionality
    console.log('Starting call with patient:', patient.id);
  };

  const handleVideoCall = () => {
    // Implement video call functionality
    console.log('Starting video call with patient:', patient.id);
  };

  const handleAppointment = () => {
    navigate(`/book-appointment?patient=${patient.id}`);
  };
  
  return (
    <div className="flex-shrink-0 w-20 cursor-pointer" onClick={handleProfileClick}>
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <Avatar className="w-16 h-16 ring-2 ring-blue-200 dark:ring-blue-800 border-2 border-white dark:border-gray-800">
            {patient.avatar_url ? (
              <AvatarImage 
                src={patient.avatar_url} 
                alt={displayName}
                className="object-cover w-full h-full rounded-full"
              />
            ) : null}
            <AvatarFallback className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {patient.first_name?.[0] || 'M'}{patient.last_name?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          {hasUrgentProblem && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse z-10"></div>
          )}
        </div>
        
        <div className="text-center w-full">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">
            {displayName}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {patient.email}
          </p>
          <div className="flex justify-center mt-1">
            <Badge variant="secondary" className="text-xs">Mgonjwa</Badge>
          </div>
          {patient.country && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center">
              <MapPin className="w-2 h-2 mr-1" />
              <span className="truncate">{patient.country}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

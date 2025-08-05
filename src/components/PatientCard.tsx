
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
    <div 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-0 rounded-3xl bg-gradient-to-br relative overflow-hidden p-4 ${
        hasUrgentProblem 
          ? 'from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 shadow-red-200' 
          : 'from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 shadow-gray-200'
      }`}
      onClick={handleProfileClick}
    >
      <div className="flex items-center space-x-3">
        {/* Red indicator for urgent problems */}
        {hasUrgentProblem && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
        )}
        
        <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
          <AvatarImage src={patient.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {patient.first_name?.[0] || patient.email?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
            {displayName}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {patient.phone || patient.email}
          </p>
        </div>
      </div>
    </div>
  );
}

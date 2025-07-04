
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Video, MapPin, Calendar } from 'lucide-react';
import { useCallSession } from '@/hooks/useCallSession';
import { useToast } from '@/hooks/use-toast';
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
  const { initiateCall } = useCallSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const displayName = `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Daktari';

  const handleCall = async (type: 'audio' | 'video') => {
    try {
      const session = await initiateCall(doctor.id, type);
      if (session) {
        toast({
          title: 'Ombi la Simu Limetumwa',
          description: `Ombi lako la ${type === 'audio' ? 'simu' : 'video'} limetumwa kwa daktari`,
        });
      }
    } catch (error) {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma ombi la simu',
        variant: 'destructive'
      });
    }
  };

  const handleMessage = () => {
    navigate(`/messages?doctor=${doctor.id}`);
  };

  const handleBookAppointment = () => {
    navigate(`/book-appointment?doctor=${doctor.id}`);
  };

  const handleProfileClick = () => {
    navigate(`/doctor-profile/${doctor.id}`);
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700 relative">
      {hasPatientProblem && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-4 border-white dark:border-gray-800 rounded-full animate-pulse z-10"></div>
      )}
      
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative cursor-pointer" onClick={handleProfileClick}>
            <Avatar className="w-16 h-16 ring-2 ring-emerald-200 dark:ring-emerald-800">
              {doctor.avatar_url ? (
                <AvatarImage 
                  src={doctor.avatar_url} 
                  alt={displayName}
                />
              ) : null}
              <AvatarFallback className="text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                {doctor.first_name?.[0] || 'D'}{doctor.last_name?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
          </div>
          
          <div className="text-center w-full">
            <h3 
              className="font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-emerald-600"
              onClick={handleProfileClick}
            >
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
                  Mgonjwa Anahitaji Msaada
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

          <div className="flex flex-col space-y-2 w-full">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-8"
                onClick={handleMessage}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Ujumbe
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-8"
                onClick={() => handleCall('audio')}
              >
                <Phone className="w-3 h-3 mr-1" />
                Simu
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-8"
                onClick={() => handleCall('video')}
              >
                <Video className="w-3 h-3 mr-1" />
                Video
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-8"
                onClick={handleBookAppointment}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Miadi
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

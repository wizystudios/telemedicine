
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Phone, Video, BookOpen } from 'lucide-react';
import { useCallSession } from '@/hooks/useCallSession';
import { useSavedDoctors } from '@/hooks/useSavedDoctors';
import { useAuth } from '@/hooks/useAuth';

interface DoctorCardProps {
  doctor: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: string;
  };
  isOnline?: boolean;
  hasNewPosts?: boolean;
}

export function DoctorCard({ doctor, isOnline = false, hasNewPosts = false }: DoctorCardProps) {
  const { user } = useAuth();
  const { initiateCall } = useCallSession();
  const { savedDoctors, toggleSaveDoctor } = useSavedDoctors();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const isSaved = savedDoctors.some(saved => saved.doctor_id === doctor.id);
  const isPatient = user?.role === 'patient';

  const handleCallRequest = async (type: 'chat' | 'audio' | 'video') => {
    if (!isPatient) return;
    
    setIsLoading(type);
    await initiateCall(doctor.id, type);
    setIsLoading(null);
  };

  const handleSaveDoctor = async () => {
    if (!isPatient) return;
    await toggleSaveDoctor(doctor.id);
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {hasNewPosts && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      )}
      
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src={doctor.avatar_url} />
              <AvatarFallback>
                {doctor.first_name?.[0]}{doctor.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Dr. {doctor.first_name} {doctor.last_name}
            </h3>
            <div className="flex items-center justify-center space-x-2 mt-1">
              {isOnline && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Online</Badge>}
              {hasNewPosts && <BookOpen className="w-4 h-4 text-green-600" />}
            </div>
          </div>

          {isPatient && (
            <div className="flex flex-col space-y-2 w-full">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCallRequest('chat')}
                  disabled={!isOnline || isLoading === 'chat'}
                  className="flex-1"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCallRequest('audio')}
                  disabled={!isOnline || isLoading === 'audio'}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCallRequest('video')}
                  disabled={!isOnline || isLoading === 'video'}
                  className="flex-1"
                >
                  <Video className="w-4 h-4 mr-1" />
                  Video
                </Button>
                <Button
                  variant={isSaved ? "default" : "outline"}
                  size="sm"
                  onClick={handleSaveDoctor}
                  className="flex-1"
                >
                  <Heart className={`w-4 h-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Video, Heart, MapPin } from 'lucide-react';

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
}

interface DoctorCardProps {
  doctor: Doctor;
  isOnline?: boolean;
  hasNewPosts?: boolean;
}

export function DoctorCard({ doctor, isOnline = false, hasNewPosts = false }: DoctorCardProps) {
  const displayName = `${doctor.first_name || 'Dkt'} ${doctor.last_name || ''}`.trim() || 'Daktari';
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="w-16 h-16">
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
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {doctor.email}
            </p>
            <div className="flex justify-center items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-200">
                Daktari
              </Badge>
              {isOnline && (
                <Badge variant="default" className="text-xs bg-green-500 dark:bg-green-600">
                  Online
                </Badge>
              )}
              {hasNewPosts && (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 dark:text-blue-400">
                  Machapisho Mapya
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
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <MessageCircle className="w-3 h-3 mr-1" />
                Ujumbe
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <Phone className="w-3 h-3 mr-1" />
                Simu
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <Video className="w-3 h-3 mr-1" />
                Video
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <Heart className="w-3 h-3 mr-1" />
                Hifadhi
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { useCallSession } from '@/hooks/useCallSession';
import { useAuth } from '@/hooks/useAuth';

export function CallInterface() {
  const { user } = useAuth();
  const { activeCall, endCall } = useCallSession();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  if (!activeCall) return null;

  const otherUser = activeCall.patient_id === user?.id ? activeCall.doctor : activeCall.patient;
  const isVideo = activeCall.call_type === 'video';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <Card className="w-full max-w-4xl mx-4 bg-gray-900 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isVideo ? 'Video Call' : 'Audio Call'} with {otherUser.first_name} {otherUser.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Avatar className="w-32 h-32">
              <AvatarImage src={otherUser.avatar_url} />
              <AvatarFallback className="text-4xl">
                {otherUser.first_name?.[0]}{otherUser.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>

          {isVideo && (
            <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Video stream would appear here</p>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-full w-16 h-16"
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {isVideo && (
              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="lg"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className="rounded-full w-16 h-16"
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="lg"
              onClick={() => endCall(activeCall.id)}
              className="rounded-full w-16 h-16"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

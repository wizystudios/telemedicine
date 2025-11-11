import React from 'react';
import { SmartChatbot } from '@/components/SmartChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Stethoscope, 
  MapPin, 
  Pill, 
  TestTube, 
  Clock, 
  Shield, 
  Star,
  Users,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function ChatbotHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookAppointment = (doctorId: string) => {
    if (!user) {
      toast({
        title: "Ingia kwanza",
        description: "Unahitaji kuingia ili kuratibu miadi.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    navigate(`/book-appointment?doctorId=${doctorId}`);
  };

  const handleViewHospital = (hospitalId: string) => {
    navigate(`/hospital/${hospitalId}`);
  };

  const handleViewPharmacy = (pharmacyId: string) => {
    navigate(`/pharmacy/${pharmacyId}`);
  };

  const features = [
    {
      icon: Stethoscope,
      title: "Tafuta Madaktari",
      description: "Pata madaktari bora karibu nawe",
      color: "text-blue-600 bg-blue-100"
    },
    {
      icon: MapPin,
      title: "Hospitali & Kliniki",
      description: "Orodha kamili ya hospitali zilizoidhinishwa",
      color: "text-green-600 bg-green-100"
    },
    {
      icon: Pill,
      title: "Maduka ya Dawa",
      description: "Pata dawa zako kwa urahisi",
      color: "text-purple-600 bg-purple-100"
    },
    {
      icon: TestTube,
      title: "Maabara",
      description: "Panga upimaji wako",
      color: "text-orange-600 bg-orange-100"
    },
    {
      icon: Clock,
      title: "Miadi 24/7",
      description: "Ratiba miadi wakati wowote",
      color: "text-red-600 bg-red-100"
    },
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Msaidizi mkuu wa kidigitali",
      color: "text-indigo-600 bg-indigo-100"
    }
  ];

  const stats = [
    { number: "500+", label: "Madaktari", icon: Stethoscope },
    { number: "50+", label: "Hospitali", icon: MapPin },
    { number: "1000+", label: "Wagonjwa", icon: Users },
    { number: "4.9★", label: "Ukadiriaji", icon: Star }
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-2">
        <SmartChatbot 
          onBookAppointment={handleBookAppointment}
          onViewHospital={handleViewHospital}
          onViewPharmacy={handleViewPharmacy}
        />
      </div>
    </div>
  );
}
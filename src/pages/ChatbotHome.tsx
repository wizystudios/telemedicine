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
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-3 py-4 max-w-5xl">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">
              TeleMed<span className="text-primary">Smart</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Msaidizi wa afya - Uliza, pata jibu haraka
          </p>
        </div>

        {/* Main Chatbot Interface */}
        <div className="mb-6">
          <SmartChatbot 
            onBookAppointment={handleBookAppointment}
            onViewHospital={handleViewHospital}
            onViewPharmacy={handleViewPharmacy}
          />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-3">
                <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-lg font-bold mb-0.5">{stat.number}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3">
                <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-2`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm">{feature.title}</CardTitle>
                <CardDescription className="text-xs">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Access Section */}
        {!user && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-4 text-center">
              <h2 className="text-lg font-bold mb-2">Anza Sasa!</h2>
              <p className="text-xs opacity-90 mb-3">
                Jiunge na wagonjwa wanaotumia TeleMed
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => navigate('/auth')}
                >
                  Jisajili
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="border-primary-foreground text-primary-foreground"
                >
                  Ingia
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
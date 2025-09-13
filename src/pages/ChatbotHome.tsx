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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section with Chatbot */}
      <section className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              TeleMed
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                Smart
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Msaidizi wako wa kidigitali wa huduma za afya. Uliza chochote, pata jibu mara moja!
          </p>
          <div className="flex items-center justify-center mt-4 space-x-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">Salama 100%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">24/7 Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-gray-600">Rated 4.9/5</span>
            </div>
          </div>
        </div>

        {/* Main Chatbot Interface */}
        <div className="mb-12">
          <SmartChatbot 
            onBookAppointment={handleBookAppointment}
            onViewHospital={handleViewHospital}
            onViewPharmacy={handleViewPharmacy}
          />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-3`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg text-gray-900">{feature.title}</CardTitle>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Access Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-green-500 text-white">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Anza Sasa!</h2>
              <p className="text-blue-100 mb-6">
                Jiunge na maelfu ya wagonjwa wanaotumia TeleMed kila siku
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!user ? (
                  <>
                    <Button 
                      size="lg" 
                      variant="secondary"
                      onClick={() => navigate('/auth')}
                      className="bg-white text-blue-600 hover:bg-gray-100"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Jisajili
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => navigate('/auth')}
                      className="border-white text-white hover:bg-white/10"
                    >
                      Ingia
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="lg" 
                    variant="secondary"
                    onClick={() => navigate('/dashboard')}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Nenda Dashboard
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Jinsi Inavyofanya Kazi</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Uliza Swali</h3>
              <p className="text-gray-600">
                Andika au sema unachotaka. Chatbot itakuelewa na kukupa jibu la haraka.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Pata Majibu</h3>
              <p className="text-gray-600">
                Pata orodha ya madaktari, hospitali, dawa au msaada wa kwanza kwa haraka.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Ratiba & Fanya</h3>
              <p className="text-gray-600">
                Ratiba miadi, piga simu, au tembelea mahali ulipopendekeza.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
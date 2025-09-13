import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Hospital, 
  Users, 
  Calendar, 
  Star, 
  MapPin, 
  Phone,
  Mail,
  Globe,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Hospital {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  services: string[];
  is_verified: boolean;
  is_promoted: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
}

export default function HospitalManagement() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    services: ''
  });

  useEffect(() => {
    fetchHospitals();
  }, [user]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast({
        title: "Kosa",
        description: "Imeshindwa kupata data ya hospitali.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const hospitalData = {
        ...formData,
        owner_id: user?.id,
        services: formData.services.split(',').map(s => s.trim()).filter(Boolean)
      };

      if (editingHospital) {
        const { error } = await supabase
          .from('hospitals')
          .update(hospitalData)
          .eq('id', editingHospital.id);
        
        if (error) throw error;
        
        toast({
          title: "Imefanikiwa",
          description: "Taarifa za hospitali zimebadilishwa."
        });
      } else {
        const { error } = await supabase
          .from('hospitals')
          .insert([hospitalData]);
        
        if (error) throw error;
        
        toast({
          title: "Imefanikiwa", 
          description: "Hospitali imesajiliwa. Itaidhinishwa na msimamizi."
        });
      }

      setFormData({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        services: ''
      });
      setShowForm(false);
      setEditingHospital(null);
      fetchHospitals();
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast({
        title: "Kosa",
        description: "Imeshindwa kuhifadhi taarifa za hospitali.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setFormData({
      name: hospital.name,
      description: hospital.description || '',
      address: hospital.address,
      phone: hospital.phone || '',
      email: hospital.email || '',
      website: hospital.website || '',
      services: hospital.services.join(', ')
    });
    setShowForm(true);
  };

  const handleDelete = async (hospitalId: string) => {
    if (!window.confirm('Je, una uhakika unataka kufuta hospitali hii?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', hospitalId);

      if (error) throw error;

      toast({
        title: "Imefanikiwa",
        description: "Hospitali imefutwa."
      });
      
      fetchHospitals();
    } catch (error) {
      console.error('Error deleting hospital:', error);
      toast({
        title: "Kosa",
        description: "Imeshindwa kufuta hospitali.",
        variant: "destructive"
      });
    }
  };

  const stats = [
    { title: "Jumla ya Hospitali", value: hospitals.length.toString(), icon: Hospital },
    { title: "Zilizoidhinishwa", value: hospitals.filter(h => h.is_verified).length.toString(), icon: CheckCircle },
    { title: "Zinazosubiri", value: hospitals.filter(h => !h.is_verified).length.toString(), icon: Clock },
    { title: "Zilizoimarishwa", value: hospitals.filter(h => h.is_promoted).length.toString(), icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usimamizi wa Hospitali</h1>
          <p className="text-gray-600 mt-2">Dhibiti hospitali zako na huduma zake</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ongeza Hospitali
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Orodha ya Hospitali</TabsTrigger>
          <TabsTrigger value="form">Ongeza/Edit Hospitali</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {hospitals.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Hospital className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hakuna hospitali</h3>
                <p className="text-gray-600 mb-4">Anza kwa kuongeza hospitali yako ya kwanza.</p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ongeza Hospitali
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {hospitals.map((hospital) => (
                <Card key={hospital.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Hospital className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{hospital.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {hospital.is_verified ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Imeidhinishwa
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Inasubiri
                                </Badge>
                              )}
                              {hospital.is_promoted && (
                                <Badge className="bg-yellow-100 text-yellow-700">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Imeimarishwa
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{hospital.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{hospital.address}</span>
                          </div>
                          {hospital.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{hospital.phone}</span>
                            </div>
                          )}
                          {hospital.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{hospital.email}</span>
                            </div>
                          )}
                          {hospital.website && (
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span>{hospital.website}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">{hospital.rating}</span>
                              <span className="text-sm text-gray-500">({hospital.total_reviews} reviews)</span>
                            </div>
                          </div>
                        </div>

                        {hospital.services.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Huduma:</p>
                            <div className="flex flex-wrap gap-2">
                              {hospital.services.map((service, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(hospital)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(hospital.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="form">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                {editingHospital ? 'Badilisha Taarifa za Hospitali' : 'Ongeza Hospitali Mpya'}
              </CardTitle>
              <CardDescription>
                Jaza fomu hii ili kuongeza au kubadilisha taarifa za hospitali yako.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jina la Hospitali *
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Mfano: Hospitali ya Muhimbili"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Anuani *
                    </label>
                    <Input
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Mfano: Dar es Salaam, Tanzania"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nambari ya Simu
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+255 123 456 789"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barua Pepe
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="info@hospitali.co.tz"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tovuti
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://hospitali.co.tz"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maelezo ya Hospitali
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Eleza kuhusu huduma za hospitali yako..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Huduma (tenganisha kwa koma)
                  </label>
                  <Input
                    value={formData.services}
                    onChange={(e) => setFormData({...formData, services: e.target.value})}
                    placeholder="Mfano: Upasuaji, Pediatrics, Cardiology, Emergency"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingHospital ? 'Hifadhi Mabadiliko' : 'Sajili Hospitali'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingHospital(null);
                      setFormData({
                        name: '',
                        description: '',
                        address: '',
                        phone: '',
                        email: '',
                        website: '',
                        services: ''
                      });
                    }}
                  >
                    Ghairi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
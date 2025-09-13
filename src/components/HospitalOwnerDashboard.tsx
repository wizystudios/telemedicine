import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Hospital,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Plus,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalHospitals: number;
  verifiedHospitals: number;
  totalDoctors: number;
  totalAppointments: number;
  monthlyRevenue: number;
  averageRating: number;
}

export default function HospitalOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalHospitals: 0,
    verifiedHospitals: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    monthlyRevenue: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch hospitals owned by this user
      const { data: hospitals, error: hospitalsError } = await supabase
        .from('hospitals')
        .select('*')
        .eq('owner_id', user?.id);

      if (hospitalsError) throw hospitalsError;

      // Fetch doctors in owned hospitals
      const hospitalIds = hospitals?.map(h => h.id) || [];
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctor_profiles')
        .select('*')
        .in('hospital_id', hospitalIds);

      if (doctorsError) throw doctorsError;

      // Fetch recent appointments for owned hospitals
      const doctorIds = doctors?.map(d => d.user_id) || [];
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .in('doctor_id', doctorIds)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (appointmentsError) throw appointmentsError;

      // Calculate stats
      const verifiedCount = hospitals?.filter(h => h.is_verified).length || 0;
      const avgRating = hospitals?.length ? 
        hospitals.reduce((acc, h) => acc + (h.rating || 0), 0) / hospitals.length : 0;

      setStats({
        totalHospitals: hospitals?.length || 0,
        verifiedHospitals: verifiedCount,
        totalDoctors: doctors?.length || 0,
        totalAppointments: appointments?.length || 0,
        monthlyRevenue: (appointments?.length || 0) * 50, // Estimate
        averageRating: avgRating
      });

      // Set recent activity
      const activity = [
        ...(appointments?.slice(0, 5).map(apt => ({
          type: 'appointment',
          title: 'New Appointment',
          description: `Appointment scheduled`,
          time: apt.created_at,
          status: apt.status
        })) || [])
      ];

      setRecentActivity(activity);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Kosa",
        description: "Imeshindwa kupata data ya dashboard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Jumla ya Hospitali",
      value: stats.totalHospitals.toString(),
      icon: Hospital,
      color: "text-blue-600 bg-blue-100",
      trend: "+2.5%"
    },
    {
      title: "Zilizoidhinishwa",
      value: stats.verifiedHospitals.toString(),
      icon: CheckCircle,
      color: "text-green-600 bg-green-100",
      trend: "+12%"
    },
    {
      title: "Madaktari",
      value: stats.totalDoctors.toString(),
      icon: Users,
      color: "text-purple-600 bg-purple-100",
      trend: "+5.2%"
    },
    {
      title: "Miadi (Mwezi)",
      value: stats.totalAppointments.toString(),
      icon: Calendar,
      color: "text-orange-600 bg-orange-100",
      trend: "+18%"
    },
    {
      title: "Mapato (Mwezi)",
      value: `TZS ${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-100",
      trend: "+23%"
    },
    {
      title: "Ukadiriaji",
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: "text-yellow-600 bg-yellow-100",
      trend: "+0.3"
    }
  ];

  const quickActions = [
    {
      title: "Ongeza Hospitali",
      description: "Sajili hospitali mpya",
      icon: Plus,
      action: () => navigate('/hospital-management'),
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      title: "Daktari Mpya",
      description: "Ongeza daktari hospitali",
      icon: UserPlus,
      action: () => navigate('/doctors'),
      color: "bg-green-600 hover:bg-green-700"
    },
    {
      title: "Ripoti",
      description: "Ona ripoti za kina",
      icon: BarChart3,
      action: () => navigate('/reports'),
      color: "bg-purple-600 hover:bg-purple-700"
    },
    {
      title: "Matangazo",
      description: "Panga matangazo",
      icon: TrendingUp,
      action: () => navigate('/promotions'),
      color: "bg-orange-600 hover:bg-orange-700"
    }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard ya Mmiliki wa Hospitali</h1>
        <p className="text-gray-600 mt-2">Dhibiti na fuatilia shughuli za hospitali zako</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow smart-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  {stat.trend}
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Vitendo vya Haraka</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 hover:shadow-md transition-shadow"
                  onClick={action.action}
                >
                  <div className={`p-2 rounded-lg mr-3 ${action.color}`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-gray-500">{action.description}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Shughuli za Hivi Karibuni</span>
              </CardTitle>
              <CardDescription>
                Shughuli za hivi karibuni katika hospitali zako
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Hakuna shughuli za hivi karibuni</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {activity.type === 'appointment' && (
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge 
                          variant={activity.status === 'confirmed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="mt-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Muhtasari wa Utendaji</CardTitle>
            <CardDescription>
              Takwimu za utendaji wa hospitali zako kwa mwezi huu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Muhtasari</TabsTrigger>
                <TabsTrigger value="hospitals">Hospitali</TabsTrigger>
                <TabsTrigger value="doctors">Madaktari</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <Hospital className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-900">{stats.totalHospitals}</div>
                    <div className="text-sm text-blue-700">Jumla ya Hospitali</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-900">{stats.totalDoctors}</div>
                    <div className="text-sm text-green-700">Madaktari Wote</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-900">{stats.totalAppointments}</div>
                    <div className="text-sm text-purple-700">Miadi ya Mwezi</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hospitals">
                <div className="text-center py-8">
                  <Hospital className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Orodha ya hospitali zako itaonekana hapa</p>
                  <Button 
                    onClick={() => navigate('/hospital-management')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ona Hospitali Zote
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="doctors">
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Orodha ya madaktari wako itaonekana hapa</p>
                  <Button 
                    onClick={() => navigate('/doctors')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Ona Madaktari Wote
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
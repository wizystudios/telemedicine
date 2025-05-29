
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, FileText, Video, Star, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch upcoming appointments for patients
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['appointments', 'upcoming', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_profiles!appointments_doctor_id_fkey(
            user_id,
            specialties(name)
          )
        `)
        .eq('patient_id', user?.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5);
      
      if (error) {
        console.error('Error fetching upcoming appointments:', error);
        return [];
      }
      
      // Get doctor profiles separately
      const appointmentsWithDoctors = await Promise.all(
        (data || []).map(async (appointment) => {
          if (appointment.doctor_id) {
            const { data: doctorProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', appointment.doctor_id)
              .single();
            
            return {
              ...appointment,
              doctor_profile: doctorProfile
            };
          }
          return appointment;
        })
      );
      
      return appointmentsWithDoctors;
    },
    enabled: !!user?.id && profile?.role === 'patient'
  });

  // Fetch recent appointments for doctors
  const { data: recentAppointments } = useQuery({
    queryKey: ['appointments', 'recent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', user?.id)
        .order('appointment_date', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching recent appointments:', error);
        return [];
      }
      
      // Get patient profiles separately
      const appointmentsWithPatients = await Promise.all(
        (data || []).map(async (appointment) => {
          if (appointment.patient_id) {
            const { data: patientProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', appointment.patient_id)
              .single();
            
            return {
              ...appointment,
              patient_profile: patientProfile
            };
          }
          return appointment;
        })
      );
      
      return appointmentsWithPatients;
    },
    enabled: !!user?.id && profile?.role === 'doctor'
  });

  // Stats for patients
  const { data: patientStats } = useQuery({
    queryKey: ['patient-stats', user?.id],
    queryFn: async () => {
      const [appointmentsResult, reviewsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, status')
          .eq('patient_id', user?.id),
        supabase
          .from('reviews')
          .select('id')
          .eq('patient_id', user?.id)
      ]);

      return {
        totalAppointments: appointmentsResult.data?.length || 0,
        completedAppointments: appointmentsResult.data?.filter(a => a.status === 'completed').length || 0,
        totalReviews: reviewsResult.data?.length || 0
      };
    },
    enabled: !!user?.id && profile?.role === 'patient'
  });

  // Stats for doctors
  const { data: doctorStats } = useQuery({
    queryKey: ['doctor-stats', user?.id],
    queryFn: async () => {
      const [appointmentsResult, reviewsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, status')
          .eq('doctor_id', user?.id),
        supabase
          .from('reviews')
          .select('rating')
          .eq('doctor_id', user?.id)
      ]);

      const totalRating = reviewsResult.data?.reduce((sum, review) => sum + review.rating, 0) || 0;
      const avgRating = reviewsResult.data?.length ? totalRating / reviewsResult.data.length : 0;

      return {
        totalAppointments: appointmentsResult.data?.length || 0,
        completedAppointments: appointmentsResult.data?.filter(a => a.status === 'completed').length || 0,
        totalReviews: reviewsResult.data?.length || 0,
        averageRating: avgRating
      };
    },
    enabled: !!user?.id && profile?.role === 'doctor'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderPatientDashboard = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats?.totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {patientStats?.completedAppointments || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Given</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              Thank you for your feedback
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/doctors')}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Find Doctor
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Dr. {appointment.doctor_profile?.first_name || 'Doctor'} {appointment.doctor_profile?.last_name || ''}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {appointment.doctor_profiles?.specialties?.name || 'General Practice'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(appointment.appointment_date), 'MMM dd, yyyy at h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    {appointment.consultation_type === 'video' && (
                      <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                        <Video className="w-4 h-4 mr-2" />
                        Join Call
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No upcoming appointments
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Book your first consultation with a healthcare professional.
              </p>
              <Button 
                onClick={() => navigate('/doctors')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Find a Doctor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderDoctorDashboard = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctorStats?.totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {doctorStats?.completedAppointments || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctorStats?.averageRating ? doctorStats.averageRating.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              From {doctorStats?.totalReviews || 0} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Treated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctorStats?.completedAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successful consultations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              Update Schedule
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Recent Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments && recentAppointments.length > 0 ? (
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {appointment.patient_profile?.first_name || 'Patient'} {appointment.patient_profile?.last_name || ''}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {format(new Date(appointment.appointment_date), 'MMM dd, yyyy at h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No appointments yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your recent appointments will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {profile?.first_name || 'User'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {profile?.role === 'patient' 
              ? 'Manage your health appointments and consultations'
              : 'Manage your practice and patient appointments'
            }
          </p>
        </div>

        {/* Role-based Dashboard */}
        {profile?.role === 'patient' ? renderPatientDashboard() : renderDoctorDashboard()}
      </div>
    </div>
  );
}

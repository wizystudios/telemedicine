import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  MessageCircle,
  Stethoscope,
  Pill,
  FileText,
  Clock,
  MapPin,
  Bell,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PatientDashboard() {
  const navigate = useNavigate();

  const upcomingAppointments = [
    {
      id: 1,
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      date: '2024-01-15',
      time: '10:00 AM',
      type: 'Video Call',
      status: 'confirmed'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'appointment',
      message: 'Appointment booked with Dr. Sarah Johnson',
      time: '2 hours ago'
    },
    {
      id: 2,
      type: 'message',
      message: 'New message from Dr. Michael Brown',
      time: '1 day ago'
    }
  ];

  const quickActions = [
    {
      title: 'Find Doctor',
      description: 'Search for specialists',
      icon: Stethoscope,
      action: () => navigate('/chatbot'),
      color: 'bg-medical-light-blue text-medical-blue'
    },
    {
      title: 'Book Appointment',
      description: 'Schedule consultation',
      icon: Calendar,
      action: () => navigate('/book-appointment'),
      color: 'bg-medical-light-green text-medical-green'
    },
    {
      title: 'Find Pharmacy',
      description: 'Locate nearby pharmacy',
      icon: Pill,
      action: () => navigate('/chatbot'),
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Medical Records',
      description: 'View your records',
      icon: FileText,
      action: () => navigate('/profile'),
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-medical-gradient-light min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Dashboard</h1>
          <p className="text-medical-gray">Welcome back! Here's your health overview.</p>
        </div>
        <Button 
          onClick={() => navigate('/chatbot')} 
          className="bg-medical-gradient text-white"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat Assistant
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-medical-strong transition-shadow bg-white" onClick={action.action}>
            <CardContent className="p-6">
              <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground">{action.title}</h3>
              <p className="text-sm text-medical-gray">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="bg-white shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-medical-blue" />
              <span>Upcoming Appointments</span>
            </CardTitle>
            <CardDescription>Your scheduled consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-medical-light-blue rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-medical-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{appointment.doctor}</h4>
                        <p className="text-sm text-medical-gray">{appointment.specialty}</p>
                        <div className="flex items-center space-x-2 text-sm text-medical-gray">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.date} at {appointment.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-medical-light-green text-medical-green mb-2">
                        {appointment.status}
                      </Badge>
                      <p className="text-sm text-medical-gray">{appointment.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-medical-gray mx-auto mb-4" />
                <p className="text-medical-gray">No upcoming appointments</p>
                <Button 
                  className="mt-2 bg-medical-blue hover:bg-medical-blue/90" 
                  onClick={() => navigate('/book-appointment')}
                >
                  Book Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-medical-green" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Your latest health activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-medical-light-blue rounded-full flex items-center justify-center">
                    {activity.type === 'appointment' ? (
                      <Calendar className="w-4 h-4 text-medical-blue" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-medical-blue" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-medical-gray">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Tips */}
      <Card className="bg-white shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-medical-warning" />
            <span>Health Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-medical-light-blue rounded-lg">
              <h4 className="font-semibold text-medical-blue mb-2">Stay Hydrated</h4>
              <p className="text-sm text-medical-gray">Drink at least 8 glasses of water daily for optimal health.</p>
            </div>
            <div className="p-4 bg-medical-light-green rounded-lg">
              <h4 className="font-semibold text-medical-green mb-2">Regular Exercise</h4>
              <p className="text-sm text-medical-gray">30 minutes of daily exercise can improve your overall well-being.</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">Healthy Sleep</h4>
              <p className="text-sm text-medical-gray">Aim for 7-9 hours of quality sleep each night.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
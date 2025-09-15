import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar,
  MessageCircle,
  Users,
  Clock,
  Activity,
  Bell,
  CheckCircle,
  XCircle,
  Phone,
  Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DoctorDashboard() {
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = useState(true);

  const pendingAppointments = [
    {
      id: 1,
      patient: 'John Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      type: 'Video Call',
      reason: 'Heart consultation'
    },
    {
      id: 2,
      patient: 'Maria Garcia',
      date: '2024-01-15',
      time: '2:00 PM',
      type: 'Phone Call',
      reason: 'Follow-up check'
    }
  ];

  const todayAppointments = [
    {
      id: 1,
      patient: 'Alice Johnson',
      time: '9:00 AM',
      type: 'Video Call',
      status: 'confirmed'
    },
    {
      id: 2,
      patient: 'Bob Wilson',
      time: '11:00 AM',
      type: 'Phone Call',
      status: 'pending'
    }
  ];

  const stats = [
    {
      title: 'Today\'s Patients',
      value: '8',
      icon: Users,
      color: 'text-medical-blue'
    },
    {
      title: 'Pending Requests',
      value: '3',
      icon: Clock,
      color: 'text-medical-warning'
    },
    {
      title: 'Completed Today',
      value: '5',
      icon: CheckCircle,
      color: 'text-medical-success'
    },
    {
      title: 'Total Rating',
      value: '4.9',
      icon: Activity,
      color: 'text-medical-warning'
    }
  ];

  const handleAcceptAppointment = (appointmentId: number) => {
    console.log('Accepted appointment:', appointmentId);
  };

  const handleRejectAppointment = (appointmentId: number) => {
    console.log('Rejected appointment:', appointmentId);
  };

  return (
    <div className="p-6 space-y-6 bg-medical-gradient-light min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
          <p className="text-medical-gray">Manage your consultations and patients</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-medical-gray">Available</span>
            <Switch 
              checked={isAvailable} 
              onCheckedChange={setIsAvailable}
            />
          </div>
          <Badge className={isAvailable ? 'bg-medical-light-green text-medical-green' : 'bg-gray-100 text-gray-600'}>
            {isAvailable ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-white shadow-medical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-medical-gray">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Appointment Requests */}
        <Card className="bg-white shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-medical-warning" />
              <span>Pending Requests</span>
            </CardTitle>
            <CardDescription>Appointment requests awaiting your response</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAppointments.length > 0 ? (
              <div className="space-y-4">
                {pendingAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{appointment.patient}</h4>
                        <p className="text-sm text-medical-gray">{appointment.reason}</p>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-medical-gray">
                        {appointment.type === 'Video Call' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                        <span>{appointment.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-medical-gray">
                        {appointment.date} at {appointment.time}
                      </div>
                      <div className="space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectAppointment(appointment.id)}
                          className="text-medical-error border-medical-error hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleAcceptAppointment(appointment.id)}
                          className="bg-medical-success hover:bg-medical-success/90"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-medical-gray mx-auto mb-4" />
                <p className="text-medical-gray">No pending requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="bg-white shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-medical-blue" />
              <span>Today's Schedule</span>
            </CardTitle>
            <CardDescription>Your confirmed appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-medical-light-blue rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-medical-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{appointment.patient}</h4>
                        <div className="flex items-center space-x-2 text-sm text-medical-gray">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                          {appointment.type === 'Video Call' ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        appointment.status === 'confirmed' 
                          ? 'bg-medical-light-green text-medical-green' 
                          : 'bg-yellow-100 text-yellow-700'
                      }>
                        {appointment.status}
                      </Badge>
                      <Button size="sm" className="mt-2 bg-medical-blue hover:bg-medical-blue/90">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-medical-gray mx-auto mb-4" />
                <p className="text-medical-gray">No appointments scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white shadow-medical">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="p-6 h-auto flex-col space-y-2"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="w-8 h-8 text-medical-blue" />
              <span>Manage Schedule</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-6 h-auto flex-col space-y-2"
              onClick={() => navigate('/patients')}
            >
              <Users className="w-8 h-8 text-medical-green" />
              <span>View Patients</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-6 h-auto flex-col space-y-2"
              onClick={() => navigate('/profile')}
            >
              <Activity className="w-8 h-8 text-medical-warning" />
              <span>Update Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
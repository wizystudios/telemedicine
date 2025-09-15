import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building,
  Users,
  Stethoscope,
  Pill,
  TestTube,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Calendar,
  Activity
} from 'lucide-react';

export function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  const systemStats = [
    {
      title: 'Total Hospitals',
      value: '248',
      icon: Building,
      color: 'text-medical-blue',
      change: '+12 this month'
    },
    {
      title: 'Active Doctors',
      value: '1,847',
      icon: Stethoscope,
      color: 'text-medical-green',
      change: '+89 this month'
    },
    {
      title: 'Total Patients',
      value: '45,692',
      icon: Users,
      color: 'text-medical-warning',
      change: '+1,234 this month'
    },
    {
      title: 'Monthly Revenue',
      value: '$284,592',
      icon: DollarSign,
      color: 'text-medical-success',
      change: '+18.2% from last month'
    }
  ];

  const pendingApprovals = [
    {
      id: 1,
      type: 'hospital',
      name: 'City General Hospital',
      owner: 'Dr. James Wilson',
      submitted: '2 days ago',
      status: 'pending'
    },
    {
      id: 2,
      type: 'pharmacy',
      name: 'MediCare Pharmacy',
      owner: 'Sarah Johnson',
      submitted: '1 day ago',
      status: 'pending'
    },
    {
      id: 3,
      type: 'laboratory',
      name: 'Advanced Lab Services',
      owner: 'Dr. Michael Brown',
      submitted: '3 hours ago',
      status: 'pending'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Hospital approved',
      entity: 'Metro Medical Center',
      time: '2 hours ago',
      type: 'approval'
    },
    {
      id: 2,
      action: 'Doctor verified',
      entity: 'Dr. Lisa Anderson',
      time: '4 hours ago',
      type: 'verification'
    },
    {
      id: 3,
      action: 'Pharmacy rejected',
      entity: 'Quick Meds',
      time: '1 day ago',
      type: 'rejection'
    }
  ];

  const promotionStats = [
    {
      type: 'Daily',
      active: 12,
      revenue: '$2,480',
      growth: '+15%'
    },
    {
      type: 'Weekly',
      active: 8,
      revenue: '$8,750',
      growth: '+22%'
    },
    {
      type: 'Monthly',
      active: 15,
      revenue: '$45,200',
      growth: '+8%'
    }
  ];

  const handleApprove = (id: number) => {
    console.log('Approved:', id);
  };

  const handleReject = (id: number) => {
    console.log('Rejected:', id);
  };

  const handleView = (id: number) => {
    console.log('View details:', id);
  };

  return (
    <div className="p-6 space-y-6 bg-medical-gradient-light min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-medical-gray">System overview and management controls</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <AlertTriangle className="w-4 h-4 mr-2" />
            System Alerts
          </Button>
          <Button className="bg-medical-blue hover:bg-medical-blue/90">
            <Activity className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat, index) => (
          <Card key={index} className="bg-white shadow-medical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <TrendingUp className="w-4 h-4 text-medical-success" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-medical-gray">{stat.title}</p>
              <p className="text-xs text-medical-success mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card className="bg-white shadow-medical">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-medical-blue" />
                  <span>Recent Activities</span>
                </CardTitle>
                <CardDescription>Latest system activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'approval' ? 'bg-medical-success' :
                        activity.type === 'verification' ? 'bg-medical-blue' :
                        'bg-medical-error'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{activity.action}</p>
                        <p className="text-sm text-medical-gray">{activity.entity}</p>
                      </div>
                      <span className="text-xs text-medical-gray">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="bg-white shadow-medical">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-medical-success" />
                  <span>System Health</span>
                </CardTitle>
                <CardDescription>Current system status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">API Status</span>
                    <Badge className="bg-medical-light-green text-medical-green">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Database</span>
                    <Badge className="bg-medical-light-green text-medical-green">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Payment Gateway</span>
                    <Badge className="bg-medical-light-green text-medical-green">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Chatbot Service</span>
                    <Badge className="bg-medical-light-green text-medical-green">Running</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card className="bg-white shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-medical-warning" />
                <span>Pending Approvals</span>
              </CardTitle>
              <CardDescription>Items requiring admin approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.type === 'hospital' ? 'bg-medical-light-blue' :
                          item.type === 'pharmacy' ? 'bg-purple-100' :
                          'bg-orange-100'
                        }`}>
                          {item.type === 'hospital' && <Building className="w-5 h-5 text-medical-blue" />}
                          {item.type === 'pharmacy' && <Pill className="w-5 h-5 text-purple-600" />}
                          {item.type === 'laboratory' && <TestTube className="w-5 h-5 text-orange-600" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{item.name}</h4>
                          <p className="text-sm text-medical-gray">Owner: {item.owner}</p>
                          <p className="text-xs text-medical-gray">Submitted {item.submitted}</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700">{item.status}</Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleView(item.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReject(item.id)}
                        className="text-medical-error border-medical-error hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(item.id)}
                        className="bg-medical-success hover:bg-medical-success/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <Card className="bg-white shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-medical-warning" />
                <span>Promotion Analytics</span>
              </CardTitle>
              <CardDescription>Advertisement revenue and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {promotionStats.map((stat, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">{stat.type} Promotions</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-medical-gray">Active</span>
                        <span className="text-sm font-medium text-foreground">{stat.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-medical-gray">Revenue</span>
                        <span className="text-sm font-medium text-foreground">{stat.revenue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-medical-gray">Growth</span>
                        <span className="text-sm font-medium text-medical-success">{stat.growth}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="bg-white shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-medical-blue" />
                <span>Generate Reports</span>
              </CardTitle>
              <CardDescription>Create detailed system reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="p-6 h-auto flex-col space-y-2 bg-medical-blue hover:bg-medical-blue/90">
                  <Users className="w-8 h-8" />
                  <span>User Analytics Report</span>
                  <span className="text-sm opacity-80">Detailed user statistics and trends</span>
                </Button>
                <Button className="p-6 h-auto flex-col space-y-2 bg-medical-green hover:bg-medical-green/90">
                  <DollarSign className="w-8 h-8" />
                  <span>Revenue Report</span>
                  <span className="text-sm opacity-80">Financial performance and payments</span>
                </Button>
                <Button className="p-6 h-auto flex-col space-y-2 bg-purple-600 hover:bg-purple-700">
                  <Activity className="w-8 h-8" />
                  <span>System Usage Report</span>
                  <span className="text-sm opacity-80">Platform activity and engagement</span>
                </Button>
                <Button className="p-6 h-auto flex-col space-y-2 bg-orange-600 hover:bg-orange-700">
                  <Building className="w-8 h-8" />
                  <span>Institution Report</span>
                  <span className="text-sm opacity-80">Hospitals, pharmacies, and labs data</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
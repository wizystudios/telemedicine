import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Plus, Trash2, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LabOwnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lab, setLab] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Test form state
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testPrice, setTestPrice] = useState('');
  const [testDuration, setTestDuration] = useState('');

  useEffect(() => {
    fetchLabData();
  }, [user]);

  const fetchLabData = async () => {
    if (!user) return;

    try {
      // Fetch lab profile
      const { data: labData, error: labError } = await supabase
        .from('laboratories')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (labError) throw labError;
      setLab(labData);

      // Note: test_types is an array column, not a separate table
      setTests(labData?.test_types || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching lab data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lab data',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleAddTest = async () => {
    if (!lab || !testName) {
      toast({
        title: 'Error',
        description: 'Please fill in test name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newTest = {
        name: testName,
        description: testDescription,
        price: testPrice,
        duration: testDuration,
      };

      const updatedTests = [...tests, newTest];

      const { error } = await supabase
        .from('laboratories')
        .update({ test_types: updatedTests })
        .eq('id', lab.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test added successfully',
      });

      // Reset form
      setTestName('');
      setTestDescription('');
      setTestPrice('');
      setTestDuration('');
      setIsAddingTest(false);

      fetchLabData();
    } catch (error: any) {
      console.error('Error adding test:', error);
      toast({
        title: 'Error',
        description: 'Failed to add test',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTest = async (index: number) => {
    try {
      const updatedTests = tests.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('laboratories')
        .update({ test_types: updatedTests })
        .eq('id', lab.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test deleted successfully',
      });

      fetchLabData();
    } catch (error: any) {
      console.error('Error deleting test:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete test',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading Laboratory Dashboard...</div>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Laboratory Profile Found</CardTitle>
            <CardDescription>
              Contact the Super Admin to register your laboratory
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TestTube className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{lab.name}</h1>
            <p className="text-muted-foreground">Laboratory Management Dashboard</p>
          </div>
        </div>
        <Dialog open={isAddingTest} onOpenChange={setIsAddingTest}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Test</DialogTitle>
              <DialogDescription>
                Add a new test to your laboratory services
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="testName">Test Name *</Label>
                <Input
                  id="testName"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g., Complete Blood Count (CBC)"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Test details, preparation required..."
                />
              </div>
              <div>
                <Label htmlFor="price">Price (TZS)</Label>
                <Input
                  id="price"
                  type="number"
                  value={testPrice}
                  onChange={(e) => setTestPrice(e.target.value)}
                  placeholder="15000"
                />
              </div>
              <div>
                <Label htmlFor="duration">Results Duration</Label>
                <Input
                  id="duration"
                  value={testDuration}
                  onChange={(e) => setTestDuration(e.target.value)}
                  placeholder="e.g., 24 hours, Same day"
                />
              </div>
              <Button onClick={handleAddTest} className="w-full">
                Add Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {lab.is_verified ? '✅ Verified' : '⏳ Pending'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lab.rating || 0} ⭐</div>
            <div className="text-xs text-muted-foreground">
              {lab.total_reviews || 0} reviews
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lab Info */}
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Address:</strong> {lab.address}</div>
          <div><strong>Phone:</strong> {lab.phone || '-'}</div>
          <div><strong>Email:</strong> {lab.email || '-'}</div>
          <div><strong>Description:</strong> {lab.description || '-'}</div>
        </CardContent>
      </Card>

      {/* Tests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Available Tests
          </CardTitle>
          <CardDescription>Manage your laboratory tests and services</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {typeof test === 'string' ? test : test.name}
                  </TableCell>
                  <TableCell>
                    {typeof test === 'object' ? test.description : '-'}
                  </TableCell>
                  <TableCell>
                    {typeof test === 'object' && test.price ? `${test.price} TZS` : '-'}
                  </TableCell>
                  <TableCell>
                    {typeof test === 'object' ? test.duration : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTest(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

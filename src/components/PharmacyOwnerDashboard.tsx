import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pill, Plus, Edit, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PharmacyOwnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [loading, setLoading] = useState(true);

  // Medicine form state
  const [medicineName, setMedicineName] = useState('');
  const [medicineDescription, setMedicineDescription] = useState('');
  const [medicinePrice, setMedicinePrice] = useState('');
  const [medicineCategory, setMedicineCategory] = useState('');
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    fetchPharmacyData();
  }, [user]);

  const fetchPharmacyData = async () => {
    if (!user) return;

    try {
      // Fetch pharmacy profile
      const { data: pharmacyData, error: pharmacyError } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (pharmacyError) throw pharmacyError;
      setPharmacy(pharmacyData);

      // Fetch medicines
      if (pharmacyData) {
        const { data: medicinesData, error: medicinesError } = await supabase
          .from('pharmacy_medicines')
          .select('*')
          .eq('pharmacy_id', pharmacyData.id)
          .order('created_at', { ascending: false });

        if (medicinesError) throw medicinesError;
        setMedicines(medicinesData || []);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching pharmacy data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pharmacy data',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!pharmacy || !medicineName) {
      toast({
        title: 'Error',
        description: 'Please fill in medicine name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pharmacy_medicines')
        .insert([{
          pharmacy_id: pharmacy.id,
          name: medicineName,
          description: medicineDescription,
          price: medicinePrice ? parseFloat(medicinePrice) : null,
          category: medicineCategory,
          in_stock: inStock,
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Medicine added successfully',
      });

      // Reset form
      setMedicineName('');
      setMedicineDescription('');
      setMedicinePrice('');
      setMedicineCategory('');
      setInStock(true);
      setIsAddingMedicine(false);

      fetchPharmacyData();
    } catch (error: any) {
      console.error('Error adding medicine:', error);
      toast({
        title: 'Error',
        description: 'Failed to add medicine',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMedicine = async (medicineId: string) => {
    try {
      const { error } = await supabase
        .from('pharmacy_medicines')
        .delete()
        .eq('id', medicineId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Medicine deleted successfully',
      });

      fetchPharmacyData();
    } catch (error: any) {
      console.error('Error deleting medicine:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete medicine',
        variant: 'destructive',
      });
    }
  };

  const toggleStockStatus = async (medicineId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pharmacy_medicines')
        .update({ in_stock: !currentStatus })
        .eq('id', medicineId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stock status updated',
      });

      fetchPharmacyData();
    } catch (error: any) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stock status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading Pharmacy Dashboard...</div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Pharmacy Profile Found</CardTitle>
            <CardDescription>
              Contact the Super Admin to register your pharmacy
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
          <Pill className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{pharmacy.name}</h1>
            <p className="text-muted-foreground">Pharmacy Management Dashboard</p>
          </div>
        </div>
        <Dialog open={isAddingMedicine} onOpenChange={setIsAddingMedicine}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Medicine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medicine</DialogTitle>
              <DialogDescription>
                Add a new medicine to your pharmacy inventory
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="medicineName">Medicine Name *</Label>
                <Input
                  id="medicineName"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g., Paracetamol 500mg"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={medicineDescription}
                  onChange={(e) => setMedicineDescription(e.target.value)}
                  placeholder="Medicine details, usage, side effects..."
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={medicineCategory}
                  onChange={(e) => setMedicineCategory(e.target.value)}
                  placeholder="e.g., Pain Relief, Antibiotic"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (TZS)</Label>
                <Input
                  id="price"
                  type="number"
                  value={medicinePrice}
                  onChange={(e) => setMedicinePrice(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="inStock">In Stock</Label>
              </div>
              <Button onClick={handleAddMedicine} className="w-full">
                Add Medicine
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicines.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {medicines.filter(m => m.in_stock).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {medicines.filter(m => !m.in_stock).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {pharmacy.is_verified ? '✅ Verified' : '⏳ Pending'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medicines List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Medicine Inventory
          </CardTitle>
          <CardDescription>Manage your pharmacy's medicine stock</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell className="font-medium">{medicine.name}</TableCell>
                  <TableCell>{medicine.category || '-'}</TableCell>
                  <TableCell>
                    {medicine.price ? `${medicine.price} TZS` : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={medicine.in_stock ? 'default' : 'destructive'}
                      size="sm"
                      onClick={() => toggleStockStatus(medicine.id, medicine.in_stock)}
                    >
                      {medicine.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMedicine(medicine.id)}
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

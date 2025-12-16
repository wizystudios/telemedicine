import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Pill, Package, Plus, Loader2, Trash2, MapPin, Phone, Mail, TrendingUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function PharmacyOwnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '' });

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    try {
      const { data: pharmacyData } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (!pharmacyData) {
        setLoading(false);
        return;
      }

      setPharmacy(pharmacyData);

      const { data: medsData } = await supabase
        .from('pharmacy_medicines')
        .select('*')
        .eq('pharmacy_id', pharmacyData.id)
        .order('created_at', { ascending: false });

      setMedicines(medsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name) {
      toast({ title: 'Kosa', description: 'Jina la dawa linahitajika', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('pharmacy_medicines')
      .insert([{
        pharmacy_id: pharmacy.id,
        name: form.name,
        category: form.category,
        price: form.price ? parseFloat(form.price) : null,
        description: form.description,
        in_stock: true
      }]);

    if (error) {
      toast({ title: 'Kosa', description: 'Imeshindikana', variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: 'Dawa imeongezwa' });
      setForm({ name: '', category: '', price: '', description: '' });
      setIsAdding(false);
      fetchData();
    }
  };

  const toggleStock = async (id: string, inStock: boolean) => {
    await supabase.from('pharmacy_medicines').update({ in_stock: !inStock }).eq('id', id);
    fetchData();
  };

  const deleteMedicine = async (id: string) => {
    await supabase.from('pharmacy_medicines').delete().eq('id', id);
    toast({ title: 'Imefutwa' });
    fetchData();
  };

  const inStock = medicines.filter(m => m.in_stock).length;
  const outOfStock = medicines.length - inStock;

  const chartData = [
    { name: 'Inapatikana', value: inStock, color: 'hsl(142, 76%, 36%)' },
    { name: 'Haipatikani', value: outOfStock, color: 'hsl(0, 84%, 60%)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="p-4 text-center">
        <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Hakuna Famasi</h2>
        <p className="text-sm text-muted-foreground">Wasiliana na Super Admin kusajili famasi yako</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
            <Pill className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{pharmacy.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {pharmacy.address}
            </div>
          </div>
        </div>
        <Badge variant={pharmacy.is_verified ? 'default' : 'secondary'}>
          {pharmacy.is_verified ? 'Imethibitishwa' : 'Inasubiri'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{medicines.length}</p>
                <p className="text-[10px] text-muted-foreground">Jumla ya Dawa</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={60}>
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={15} outerRadius={25}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 text-[10px]">
              <span className="text-green-600">● {inStock} Ipo</span>
              <span className="text-red-500">● {outOfStock} Haipo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Dawa ({medicines.length})
            </CardTitle>
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Ongeza
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ongeza Dawa</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Jina la dawa *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input placeholder="Aina (mfano: Antibiotic)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <Input type="number" placeholder="Bei (TZS)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  <Button onClick={handleAdd} className="w-full">Ongeza</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {medicines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Jina</TableHead>
                  <TableHead className="text-xs">Aina</TableHead>
                  <TableHead className="text-xs">Bei</TableHead>
                  <TableHead className="text-xs">Hali</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="text-xs font-medium">{med.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{med.category || '-'}</TableCell>
                    <TableCell className="text-xs">{med.price ? `${med.price} TZS` : '-'}</TableCell>
                    <TableCell>
                      <Switch checked={med.in_stock} onCheckedChange={() => toggleStock(med.id, med.in_stock)} />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteMedicine(med.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-4">Hakuna dawa</p>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-sm font-semibold mb-2">Mawasiliano</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            {pharmacy.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{pharmacy.phone}</p>}
            {pharmacy.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{pharmacy.email}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

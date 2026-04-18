import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  user_id: string;
  pharmacy_id: string;
  medicine_id: string;
  quantity: number;
  pharmacy_medicines?: {
    id: string;
    name: string;
    price: number | null;
    dosage: string | null;
    in_stock: boolean | null;
  };
  pharmacies?: {
    id: string;
    name: string;
  };
}

export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, pharmacy_medicines(id, name, price, dosage, in_stock), pharmacies(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('cart fetch:', error);
    setItems((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // Realtime sync
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`cart-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cart_items',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchCart())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchCart]);

  const addToCart = useCallback(async (medicineId: string, pharmacyId: string, quantity = 1) => {
    if (!user) {
      toast({ title: 'Tafadhali ingia', description: 'Unahitaji kuwa umeingia.' });
      return false;
    }
    const { error } = await supabase
      .from('cart_items')
      .upsert({
        user_id: user.id,
        medicine_id: medicineId,
        pharmacy_id: pharmacyId,
        quantity,
      }, { onConflict: 'user_id,medicine_id' });
    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Imeongezwa kwenye cart' });
    return true;
  }, [user]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', id);
    if (error) toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('cart_items').delete().eq('id', id);
    if (error) toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
  }, []);

  const clearCart = useCallback(async () => {
    if (!user) return;
    await supabase.from('cart_items').delete().eq('user_id', user.id);
  }, [user]);

  const checkout = useCallback(async (notes?: string) => {
    if (!user || items.length === 0) return false;
    // Create one pharmacy_order row per item (table has medicine_name + qty)
    const rows = items.map(it => ({
      patient_id: user.id,
      pharmacy_id: it.pharmacy_id,
      medicine_id: it.medicine_id,
      medicine_name: it.pharmacy_medicines?.name || 'Dawa',
      quantity: it.quantity,
      total_price: (it.pharmacy_medicines?.price || 0) * it.quantity,
      notes: notes || null,
      status: 'pending',
    }));
    const { error } = await supabase.from('pharmacy_orders').insert(rows);
    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      return false;
    }
    await clearCart();
    toast({ title: 'Agizo limetumwa!', description: 'Famasi watawasiliana nawe.' });
    return true;
  }, [user, items, clearCart]);

  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalPrice = items.reduce(
    (sum, it) => sum + (it.pharmacy_medicines?.price || 0) * it.quantity, 0
  );

  return {
    items, loading, totalCount, totalPrice,
    addToCart, updateQuantity, removeItem, clearCart, checkout, refresh: fetchCart,
  };
}

import { supabase } from '@/integrations/supabase/client';

export type AdminUploadFile = {
  name: string;
  type: string;
  base64: string;
};

export async function fileToAdminUpload(file: File | null): Promise<AdminUploadFile | null> {
  if (!file) return null;
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    base64,
  };
}

export async function adminCreate<T = any>(action: string, payload: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-create', {
    body: { action, payload },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}
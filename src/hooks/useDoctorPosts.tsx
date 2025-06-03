
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useDoctorPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('doctor_posts')
        .select(`
          *,
          doctor:profiles!doctor_posts_doctor_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          likes:post_likes(count)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      setPosts(data || []);
    };

    fetchPosts();

    // Real-time subscription for new posts
    const channel = supabase
      .channel('doctor-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'doctor_posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createPost = async (title: string, content: string, tags: string[] = []) => {
    if (!user || user.role !== 'doctor') return null;

    const { data, error } = await supabase
      .from('doctor_posts')
      .insert({
        doctor_id: user.id,
        title,
        content,
        tags
      })
      .select()
      .single();

    if (!error) {
      setPosts(prev => [data, ...prev]);
    }

    return { data, error };
  };

  const likePost = async (postId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      });

    if (!error) {
      // Refresh posts to update like count
      const { data } = await supabase
        .from('doctor_posts')
        .select(`
          *,
          doctor:profiles!doctor_posts_doctor_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          likes:post_likes(count)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      setPosts(data || []);
    }
  };

  const incrementViews = async (postId: string) => {
    await supabase.rpc('increment_post_views', { post_id_param: postId });
  };

  return { posts, createPost, likePost, incrementViews };
}

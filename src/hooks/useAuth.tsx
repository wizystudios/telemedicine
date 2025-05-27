
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('signUp called with:', { email, userData });
    
    try {
      // Clean the userData to ensure proper mapping
      const cleanUserData = {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        role: userData.role || 'patient'
      };

      // Only add optional fields if they exist and are not empty
      if (userData.username) {
        cleanUserData.username = userData.username;
      }
      if (userData.phone) {
        cleanUserData.phone = userData.phone;
      }
      if (userData.country) {
        cleanUserData.country = userData.country;
      }
      if (userData.country_code) {
        cleanUserData.country_code = userData.country_code;
      }

      console.log('Cleaned user data:', cleanUserData);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: cleanUserData
        }
      });
      
      console.log('signUp result:', { data, error });
      
      if (error) {
        console.error('Signup error:', error);
        return { data: null, error };
      }

      // If signup is successful
      if (data.user) {
        console.log('User created successfully:', data.user.id);
      }

      return { data, error: null };
    } catch (err) {
      console.error('signUp exception:', err);
      return { data: null, error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('signIn called with:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      console.log('signIn result:', { data, error });
      return { data, error };
    } catch (err) {
      console.error('signIn exception:', err);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    console.log('signOut called');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

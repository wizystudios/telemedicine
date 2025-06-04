
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
    console.log('Setting up auth state listener...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Initial session check:', session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('signUp called with:', { email, userData });
    
    try {
      setLoading(true);
      
      // Clean and validate input data
      const cleanEmail = email.trim().toLowerCase();
      
      if (!cleanEmail || !password) {
        return { data: null, error: { message: 'Email and password are required' } };
      }

      // CRITICAL: Properly prepare user metadata with role
      const cleanUserData: Record<string, any> = {
        first_name: userData.first_name?.trim() || '',
        last_name: userData.last_name?.trim() || '',
        role: userData.role || 'patient' // Ensure role is properly set
      };

      // Add optional fields if they exist
      if (userData.username?.trim()) {
        cleanUserData.username = userData.username.trim();
      }
      if (userData.phone?.trim()) {
        cleanUserData.phone = userData.phone.trim();
      }
      if (userData.country?.trim()) {
        cleanUserData.country = userData.country.trim();
      }
      if (userData.country_code?.trim()) {
        cleanUserData.country_code = userData.country_code.trim();
      }

      console.log('Attempting signup with clean data:', { email: cleanEmail, userData: cleanUserData });
      console.log('ROLE BEING PASSED TO SUPABASE:', cleanUserData.role);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: cleanUserData
        }
      });
      
      console.log('Signup response:', { data, error });
      console.log('User metadata after signup:', data?.user?.user_metadata);
      
      if (error) {
        console.error('Signup error:', error);
        return { data: null, error };
      }

      if (data.user) {
        console.log('Signup successful for user:', data.user.id);
        console.log('User role in metadata:', data.user.user_metadata?.role);
        
        if (data.session) {
          console.log('User has active session, setting state');
          setSession(data.session);
          setUser(data.user);
        } else {
          console.log('User created but no session (email confirmation required)');
        }
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('Signup exception:', err);
      return { 
        data: null, 
        error: { message: err.message || 'Registration failed. Please try again.' } 
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('signIn called with:', email);
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      
      console.log('SignIn response:', { data, error });
      
      if (error) {
        console.error('SignIn error:', error);
        return { data: null, error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      
      return { data, error: null };
    } catch (err: any) {
      console.error('SignIn exception:', err);
      return { data: null, error: { message: 'Sign in failed. Please try again.' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('signOut called');
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('SignOut error:', error);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('SignOut exception:', err);
    } finally {
      setLoading(false);
    }
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

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor';
}

export function SimpleRegistration({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'patient'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[0-9]/.test(password) && 
           /[!@#$%^&*(),.?":{}|<>]/.test(password);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!data.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!data.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(data.password)) {
      newErrors.password = 'Password does not meet requirements';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    console.log('Starting registration with basic data...');
    setIsLoading(true);
    setErrors({});
    
    try {
      // Keep it simple - only send required fields
      const userData = {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        role: data.role
      };

      console.log('Calling signUp with minimal data:', { email: data.email, userData });
      
      const result = await signUp(data.email.trim(), data.password, userData);
      
      console.log('SignUp result:', result);
      
      if (result.error) {
        console.error('Registration failed with error:', result.error);
        
        // Handle specific error cases
        let errorMessage = result.error.message || 'Registration failed';
        
        if (errorMessage.includes('already registered')) {
          errorMessage = 'This email is already registered. Try signing in instead.';
        } else if (errorMessage.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (errorMessage.includes('password')) {
          errorMessage = 'Password must be at least 8 characters with uppercase, number, and special character.';
        }
        
        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive'
        });
        return;
      }

      console.log('Registration successful!');
      
      toast({
        title: 'Welcome to TeleHealth!',
        description: 'Your account has been created successfully.',
      });

      // Navigate to dashboard on success
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Registration exception:', error);
      toast({
        title: 'Registration Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Account
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300">
            Join TeleHealth today
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={data.firstName}
                  onChange={(e) => setData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="h-12 rounded-xl border-2 focus:border-emerald-500"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.firstName}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={data.lastName}
                  onChange={(e) => setData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="h-12 rounded-xl border-2 focus:border-emerald-500"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 rounded-xl border-2 focus:border-emerald-500"
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="role">I am a *</Label>
              <Select value={data.role} onValueChange={(value: 'patient' | 'doctor') => setData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="h-12 rounded-xl border-2 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => setData(prev => ({ ...prev, password: e.target.value }))}
                  className="h-12 rounded-xl border-2 focus:border-emerald-500 pr-10"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.password}
                </p>
              )}
              
              <div className="mt-3 space-y-1">
                <div className="flex items-center text-sm">
                  {data.password.length >= 8 ? (
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400 mr-2" />
                  )}
                  <span className={data.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {/[A-Z]/.test(data.password) ? (
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400 mr-2" />
                  )}
                  <span className={/[A-Z]/.test(data.password) ? 'text-green-600' : 'text-gray-500'}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {/[0-9]/.test(data.password) ? (
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400 mr-2" />
                  )}
                  <span className={/[0-9]/.test(data.password) ? 'text-green-600' : 'text-gray-500'}>
                    One number
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {/[!@#$%^&*(),.?":{}|<>]/.test(data.password) ? (
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400 mr-2" />
                  )}
                  <span className={/[!@#$%^&*(),.?":{}|<>]/.test(data.password) ? 'text-green-600' : 'text-gray-500'}>
                    One special character
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 h-12 rounded-xl border-2"
                disabled={isLoading}
              >
                Back
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

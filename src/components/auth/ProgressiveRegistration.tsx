
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CountrySelector } from './CountrySelector';
import { useNavigate } from 'react-router-dom';

interface RegistrationData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  role: 'patient' | 'doctor';
  password: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export function ProgressiveRegistration({ onBack }: { onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    countryCode: '',
    country: '',
    role: 'patient',
    password: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};
    
    switch (step) {
      case 1: // Names (REQUIRED)
        if (!data.firstName.trim()) {
          newErrors.firstName = t('firstNameRequired');
        } else if (data.firstName.trim().length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters';
        }
        
        if (!data.lastName.trim()) {
          newErrors.lastName = t('lastNameRequired');
        } else if (data.lastName.trim().length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters';
        }
        break;
        
      case 2: // Email & Password (REQUIRED)
        if (!data.email.trim()) {
          newErrors.email = t('emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          newErrors.email = t('emailInvalid');
        }
        
        if (!data.password) {
          newErrors.password = t('passwordRequired');
        } else if (!validatePassword(data.password)) {
          newErrors.password = 'Password must meet all requirements';
        }
        break;
        
      case 3: // Optional fields - no validation required
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    console.log('Starting registration with data:', {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username || null,
      role: data.role,
      country: data.country || null,
      countryCode: data.countryCode || null,
      phone: data.phone || null
    });

    setIsLoading(true);
    
    try {
      // Prepare user metadata - only include non-empty optional fields
      const userData: any = {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        role: data.role
      };

      // Only add optional fields if they have values
      if (data.username?.trim()) {
        userData.username = data.username.trim();
      }
      if (data.phone?.trim()) {
        userData.phone = data.phone.trim();
      }
      if (data.country?.trim()) {
        userData.country = data.country.trim();
      }
      if (data.countryCode?.trim()) {
        userData.country_code = data.countryCode.trim();
      }

      console.log('Calling signUp with userData:', userData);

      const { data: authData, error } = await signUp(data.email.trim(), data.password, userData);
      
      if (error) {
        console.error('Registration error:', error);
        toast({
          title: 'Registration Failed',
          description: error.message || 'Something went wrong during registration',
          variant: 'destructive'
        });
        return;
      }

      console.log('Registration successful:', authData);

      toast({
        title: 'Account Created Successfully!',
        description: 'Welcome! You can now access your account.',
      });

      // Navigate to dashboard immediately
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountrySelect = (country: string, countryCode: string) => {
    setData(prev => ({ ...prev, country, countryCode }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('letsGetStarted')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Tell us your name
              </p>
            </div>
            
            <div>
              <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">
                {t('firstName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={data.firstName}
                onChange={(e) => setData(prev => ({ ...prev, firstName: e.target.value }))}
                className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600"
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.firstName}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">
                {t('lastName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={data.lastName}
                onChange={(e) => setData(prev => ({ ...prev, lastName: e.target.value }))}
                className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600"
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.lastName}
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="text-red-500">*</span> Required fields
              </p>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Account Details
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your email and password
              </p>
            </div>
            
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                {t('email')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600"
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => setData(prev => ({ ...prev, password: e.target.value }))}
                  className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600 pr-10"
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
              
              <div className="mt-3 space-y-2">
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

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mt-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="text-red-500">*</span> Required fields
                </p>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Additional Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Optional details (you can skip these)
              </p>
            </div>
            
            <div>
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                Username <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="username"
                value={data.username}
                onChange={(e) => {
                  const username = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setData(prev => ({ ...prev, username }));
                }}
                className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600"
                placeholder="Choose a username (optional)"
              />
              <p className="text-gray-500 text-sm mt-1">
                Only letters, numbers, and underscores allowed
              </p>
            </div>
            
            <div>
              <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">
                {t('role')} <span className="text-red-500">*</span>
              </Label>
              <Select value={data.role} onValueChange={(value: 'patient' | 'doctor') => setData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">{t('patient')}</SelectItem>
                  <SelectItem value="doctor">{t('doctor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                Country <span className="text-gray-400">(Optional)</span>
              </Label>
              <CountrySelector
                onSelect={handleCountrySelect}
                selectedCountry={data.country}
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                Phone <span className="text-gray-400">(Optional)</span>
              </Label>
              <div className="flex space-x-2">
                <Input
                  value={data.countryCode}
                  readOnly
                  className="w-20 h-12 rounded-xl border-2 bg-gray-100 dark:bg-gray-700 text-center"
                  placeholder="+000"
                />
                <Input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                  className="flex-1 h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600"
                  placeholder="123 456 789"
                />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ All required information complete! These additional details are optional.
              </p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-6">
          {renderStep()}
          
          <div className="flex space-x-3 mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-12 rounded-xl border-2 border-gray-300 dark:border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              {currentStep === totalSteps ? (
                isLoading ? 'Creating Account...' : 'Create Account'
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

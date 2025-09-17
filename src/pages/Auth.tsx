import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  HeartHandshake, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Stethoscope,
  Building,
  Shield,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/auth/LanguageSelector';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { SimpleRegistration } from '@/components/auth/SimpleRegistration';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'signin' | 'signup' | 'roleselect'>('welcome');
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'hospital' | 'admin'>('patient');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('Attempting sign in for:', email);

    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Sign in error:', error);
      setError(error.message);
      toast({
        title: 'Sign In Failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Welcome Back!',
        description: 'Successfully signed in',
      });
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  const handleChatAsGuest = () => {
    navigate('/');
  };

  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-medical-gradient-light">
        {/* Header */}
        <div className="flex justify-end items-center p-4">
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
          {/* Logo */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="relative mb-6">
              <div className="bg-white shadow-medical-strong p-6 rounded-3xl mx-auto w-fit">
                <HeartHandshake className="w-12 h-12 text-medical-blue" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">TeleMed Smart</h1>
            <p className="text-lg text-medical-gray">AI Health Assistant</p>
          </div>

            {/* Main Action */}
            <div className="w-full max-w-sm space-y-6 animate-fade-in">
              <Button 
                onClick={handleChatAsGuest}
                className="w-full h-16 text-lg bg-medical-blue hover:bg-medical-blue/90 rounded-2xl shadow-medical transform transition-all hover:scale-105"
              >
                <HeartHandshake className="w-8 h-8" />
              </Button>
              
              {/* Professional Access */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <Button 
                  onClick={() => {
                    setSelectedRole('doctor');
                    setCurrentStep('signin');
                  }}
                  variant="outline"
                  className="h-16 flex items-center justify-center border-medical-blue/20 hover:bg-medical-light-blue rounded-xl"
                >
                  <Stethoscope className="w-8 h-8 text-medical-blue" />
                </Button>
                
                <Button 
                  onClick={() => {
                    setSelectedRole('hospital');
                    setCurrentStep('signin');
                  }}
                  variant="outline"
                  className="h-16 flex items-center justify-center border-medical-green/20 hover:bg-medical-light-green rounded-xl"
                >
                  <Building className="w-8 h-8 text-medical-green" />
                </Button>
              </div>

              {/* Patient Register */}
              <Button 
                onClick={() => setCurrentStep('signup')}
                variant="ghost"
                className="w-full h-12 text-medical-blue hover:bg-medical-light-blue rounded-xl mt-6"
              >
                <UserCheck className="w-6 h-6" />
              </Button>

              {/* Admin Access */}
              <Button 
                onClick={() => {
                  setSelectedRole('admin');
                  setCurrentStep('signin');
                }}
                variant="ghost"
                className="w-full h-8 text-xs text-medical-gray hover:text-foreground mt-4"
              >
                <Shield className="w-4 h-4" />
              </Button>
            </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-6">
          <div className="flex justify-center items-center space-x-4 text-xs text-medical-gray">
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-medical-success" />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <HeartHandshake className="w-3 h-3 text-medical-blue" />
              <span>24/7</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'signup') {
    return (
      <div className="min-h-screen bg-medical-gradient-light">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center p-4">
          <Button 
            onClick={() => setCurrentStep('welcome')}
            variant="ghost" 
            size="sm"
            className="text-medical-gray hover:text-foreground"
          >
            <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        {/* Registration */}
        <div className="flex-1 flex items-center justify-center px-4">
          <SimpleRegistration onBack={() => setCurrentStep('welcome')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medical-gradient-light">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center p-4">
          <Button 
            onClick={() => setCurrentStep('welcome')}
            variant="ghost" 
            size="sm"
            className="text-medical-gray hover:text-foreground"
          >
            <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

      {/* Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="bg-white shadow-medical-strong animate-scale-in">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-medical-gradient rounded-xl flex items-center justify-center">
                  <HeartHandshake className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-foreground">TeleMed Smart</span>
              </div>
              <CardTitle className="text-xl text-foreground">
                {selectedRole === 'doctor' && 'Doctor Login'}
                {selectedRole === 'hospital' && 'Hospital / Pharmacy Login'}
                {selectedRole === 'admin' && 'Admin Login'}
                {selectedRole === 'patient' && 'Patient Login'}
              </CardTitle>
              <p className="text-sm text-medical-gray">
                {selectedRole === 'doctor' && 'Verified medical professionals only'}
                {selectedRole === 'hospital' && 'Healthcare institutions'}
                {selectedRole === 'admin' && 'TeleMed operators'}
                {selectedRole === 'patient' && 'Registered patients'}
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-foreground">
                      Email / Phone
                    </Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      required 
                      className="h-12 rounded-xl border-2 focus:border-medical-blue"
                      placeholder="Enter your email or phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? 'text' : 'password'}
                        required 
                        className="h-12 rounded-xl border-2 focus:border-medical-blue pr-10"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medical-gray hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="flex items-center space-x-2 text-medical-error text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 text-lg bg-medical-blue hover:bg-medical-blue/90 rounded-xl"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>

                {selectedRole !== 'admin' && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-medical-gray">
                      Forgot password? Contact support
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
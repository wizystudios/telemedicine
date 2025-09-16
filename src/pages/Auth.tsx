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
        {/* Header with controls */}
        <div className="flex justify-between items-center p-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          {/* Logo and Branding */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-medical-gradient rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-white shadow-medical-strong p-8 rounded-full">
                <HeartHandshake className="w-16 h-16 text-medical-blue" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold text-foreground mb-4">
              🏥 TeleMed Smart
            </h1>
            <p className="text-xl text-medical-gray mb-2">
              Your Health, One Chat Away
            </p>
            <p className="text-sm text-medical-gray">
              AI-Powered Healthcare Assistant
            </p>
          </div>

          {/* Action buttons for different user types */}
          <div className="w-full max-w-md space-y-4 animate-fade-in">
            {/* Guest/Patient Quick Access */}
            <Button 
              onClick={handleChatAsGuest}
              className="w-full h-16 text-lg bg-medical-blue hover:bg-medical-blue/90 rounded-xl shadow-medical transform transition-all hover:scale-105 mb-6"
            >
              <HeartHandshake className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Start with Chatbot</div>
                <div className="text-sm opacity-90">Chat as guest or patient</div>
              </div>
            </Button>
            
            {/* Role-based Login Options */}
            <div className="bg-white rounded-xl shadow-medical p-6 space-y-3">
              <h3 className="text-lg font-semibold text-center text-foreground mb-4">
                Healthcare Professionals
              </h3>
              
              <Button 
                onClick={() => {
                  setSelectedRole('doctor');
                  setCurrentStep('signin');
                }}
                variant="outline"
                className="w-full h-14 text-left border-medical-blue/20 hover:bg-medical-light-blue"
              >
                <Stethoscope className="w-5 h-5 mr-3 text-medical-blue" />
                <div>
                  <div className="font-medium">Doctor Login</div>
                  <div className="text-sm text-medical-gray">Verified medical professionals</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-medical-blue" />
              </Button>
              
              <Button 
                onClick={() => {
                  setSelectedRole('hospital');
                  setCurrentStep('signin');
                }}
                variant="outline"
                className="w-full h-14 text-left border-medical-green/20 hover:bg-medical-light-green"
              >
                <Building className="w-5 h-5 mr-3 text-medical-green" />
                <div>
                  <div className="font-medium">Hospital / Pharmacy</div>
                  <div className="text-sm text-medical-gray">Healthcare institutions</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-medical-green" />
              </Button>
              
              <Button 
                onClick={() => {
                  setSelectedRole('admin');
                  setCurrentStep('signin');
                }}
                variant="outline"
                className="w-full h-14 text-left border-red-200 hover:bg-red-50"
              >
                <Shield className="w-5 h-5 mr-3 text-red-600" />
                <div>
                  <div className="font-medium">Admin Login</div>
                  <div className="text-sm text-medical-gray">TeleMed operators only</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-red-600" />
              </Button>
            </div>

            {/* Patient Registration */}
            <div className="text-center pt-4">
              <p className="text-sm text-medical-gray mb-3">New patient?</p>
              <Button 
                onClick={() => setCurrentStep('signup')}
                variant="outline"
                className="w-full h-12 border-medical-blue text-medical-blue hover:bg-medical-light-blue"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Register as Patient
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <div className="flex justify-center items-center space-x-6 text-sm text-medical-gray">
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-medical-success" />
              <span>100% Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <HeartHandshake className="w-4 h-4 text-medical-blue" />
              <span>24/7 Available</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'signup') {
    return (
      <div className="min-h-screen bg-medical-gradient-light">
        {/* Header */}
        <div className="flex justify-between items-center p-4">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep('welcome')}
            className="text-medical-gray hover:text-foreground"
          >
            ← Back
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
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentStep('welcome')}
          className="text-medical-gray hover:text-foreground"
        >
          ← Back
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
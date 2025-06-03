
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/auth/LanguageSelector';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { SimpleRegistration } from '@/components/auth/SimpleRegistration';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'signin' | 'signup'>('welcome');
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
        title: t('signInFailed'),
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: t('welcomeBack'),
        description: t('signedInSuccess'),
      });
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950 dark:via-teal-950 dark:to-blue-950 flex flex-col">
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
          {/* Logo */}
          <div className="relative mb-12 animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-white dark:bg-gray-800 p-8 rounded-full shadow-2xl">
              <Video className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          
          {/* Welcome text */}
          <div className="text-center mb-12 max-w-md animate-fade-in">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {t('appName')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('subtitle')}
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full max-w-sm space-y-4 animate-fade-in">
            <Button 
              onClick={() => setCurrentStep('signin')}
              className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 rounded-xl shadow-lg transform transition-all hover:scale-105"
            >
              {t('signIn')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              onClick={() => setCurrentStep('signup')}
              variant="outline"
              className="w-full h-14 text-lg border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950 rounded-xl shadow-lg transform transition-all hover:scale-105"
            >
              {t('createAccount')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('securePrivateProfessional')}
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950 dark:via-teal-950 dark:to-blue-950 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep('welcome')}
            className="text-gray-600 dark:text-gray-300"
          >
            ← {t('back')}
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950 dark:via-teal-950 dark:to-blue-950 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentStep('welcome')}
          className="text-gray-600 dark:text-gray-300"
        >
          ← {t('back')}
        </Button>
        <div className="flex items-center space-x-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      {/* Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Video className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{t('appName')}</span>
              </div>
              <CardTitle className="text-xl">{t('signIn')}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                      {t('email')}
                    </Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      required 
                      className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600"
                      placeholder={t('enterEmail')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                      {t('password')}
                    </Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? 'text' : 'password'}
                        required 
                        className="h-12 rounded-xl border-2 focus:border-emerald-500 dark:border-gray-600 pr-10"
                        placeholder={t('enterPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 rounded-xl"
                >
                  {isLoading ? t('signingIn') : t('signIn')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

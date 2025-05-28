
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Video, Users, Shield } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface WelcomePagesProps {
  onComplete: () => void;
}

export function WelcomePages({ onComplete }: WelcomePagesProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const { t } = useTranslation();

  const pages = [
    {
      icon: <Video className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />,
      title: "Welcome to TeleHealth",
      description: "Connect with certified doctors from the comfort of your home. Get professional medical consultations through secure video calls.",
      gradient: "from-emerald-400 to-teal-500"
    },
    {
      icon: <Users className="w-16 h-16 text-blue-600 dark:text-blue-400" />,
      title: "Expert Medical Care",
      description: "Access a network of experienced healthcare professionals across various specialties. Book appointments that fit your schedule.",
      gradient: "from-blue-400 to-indigo-500"
    },
    {
      icon: <Shield className="w-16 h-16 text-purple-600 dark:text-purple-400" />,
      title: "Secure & Private",
      description: "Your health information is protected with enterprise-grade security. HIPAA compliant platform you can trust.",
      gradient: "from-purple-400 to-pink-500"
    }
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950 dark:via-teal-950 dark:to-blue-950 flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <Button 
          variant="ghost" 
          onClick={handleSkip}
          className="text-gray-600 dark:text-gray-300 hover:text-emerald-600"
        >
          Skip
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-lg border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            {/* Icon with animated background */}
            <div className="relative mb-8 flex justify-center">
              <div className={`absolute inset-0 bg-gradient-to-r ${pages[currentPage].gradient} rounded-full blur-xl opacity-30 animate-pulse`}></div>
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-lg">
                {pages[currentPage].icon}
              </div>
            </div>

            {/* Content */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {pages[currentPage].title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {pages[currentPage].description}
            </p>

            {/* Page indicators */}
            <div className="flex justify-center space-x-2 mb-8">
              {pages.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentPage 
                      ? 'bg-emerald-600 dark:bg-emerald-400' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between space-x-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentPage === 0}
                className="flex-1 h-12 rounded-xl border-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button
                onClick={handleNext}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              >
                {currentPage === pages.length - 1 ? 'Get Started' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

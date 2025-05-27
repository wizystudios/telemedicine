
import { useTranslation } from '@/hooks/useTranslation';
import { Video } from 'lucide-react';

export function LoadingScreen() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950 dark:via-teal-950 dark:to-blue-950 flex flex-col items-center justify-center">
      {/* Logo with animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-2xl">
          <Video className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-bounce" />
        </div>
      </div>
      
      {/* App name */}
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 animate-fade-in">
        {t('appName')}
      </h1>
      
      {/* Loading text */}
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 animate-fade-in">
        {t('initializing')}
      </p>
      
      {/* Loading indicator */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('poweredBy')}
        </p>
      </div>
    </div>
  );
}

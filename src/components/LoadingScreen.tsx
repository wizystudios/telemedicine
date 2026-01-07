import { HeartPulse } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="flex flex-col items-center mb-16">
        <div className="relative mb-4">
          <div className="h-20 w-20 rounded-full border-2 border-primary/60 flex items-center justify-center">
            <HeartPulse className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wider">
          TeleMed
        </h1>
      </div>
      
      {/* Loading dots */}
      <div className="flex items-center space-x-2 mb-20">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      </div>

      {/* From WeTech */}
      <div className="absolute bottom-16 text-center">
        <p className="text-sm text-muted-foreground mb-2">from</p>
        <p className="text-xl font-semibold text-primary tracking-wide">WeTech</p>
      </div>
    </div>
  );
}
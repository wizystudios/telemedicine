import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center rounded-3xl border border-border bg-card p-6">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="text-xl font-bold mt-2">Ukurasa haujapatikana</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-5">Kiungo hiki hakipo, lakini unaweza kuendelea kutumia mfumo bila ku-refresh.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Rudi</Button>
          <Button onClick={() => navigate('/dashboard')}><Home className="h-4 w-4 mr-1" /> Nyumbani</Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { NearbyMap } from '@/components/NearbyMap';

export default function NearbyPlaces() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto p-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-2 text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Rudi Nyuma
          </Button>
          
          <h1 className="text-2xl font-bold">Maeneo ya Karibu</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            Tafuta hospitali, maduka ya dawa, na maabara karibu nawe
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <NearbyMap />
      </div>
    </div>
  );
}

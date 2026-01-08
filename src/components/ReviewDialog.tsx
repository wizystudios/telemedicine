import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
}

export function ReviewDialog({ open, onOpenChange, appointmentId, doctorId, doctorName }: ReviewDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast({ title: 'Chagua nyota', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        patient_id: user.id,
        doctor_id: doctorId,
        appointment_id: appointmentId,
        rating,
        review_text: reviewText || null
      });

      if (error) throw error;

      toast({ title: 'Asante!', description: 'Maoni yako yamehifadhiwa.' });
      onOpenChange(false);
      setRating(0);
      setReviewText('');
    } catch (error: any) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Tathmini Dr. {doctorName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star 
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-muted-foreground/30'
                  }`} 
                />
              </button>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 && 'Bofya nyota kutathmini'}
            {rating === 1 && 'Mbaya sana'}
            {rating === 2 && 'Mbaya'}
            {rating === 3 && 'Wastani'}
            {rating === 4 && 'Nzuri'}
            {rating === 5 && 'Bora sana!'}
          </p>

          {/* Review Text */}
          <div>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Andika maoni yako (hiari)..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Baadaye
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Inatuma...' : 'Tuma Tathmini'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

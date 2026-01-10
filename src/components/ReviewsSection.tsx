import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star, MessageCircle, ThumbsUp, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CollapsibleSection } from '@/components/CollapsibleSection';

interface ReviewsSectionProps {
  entityType: 'doctor' | 'hospital' | 'pharmacy' | 'laboratory' | 'polyclinic';
  entityId: string;
  entityName: string;
  showForm?: boolean;
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  patient_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export function ReviewsSection({ entityType, entityId, entityName, showForm = true }: ReviewsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch reviews based on entity type
  const { data: reviews = [], refetch } = useQuery({
    queryKey: ['reviews', entityType, entityId],
    queryFn: async () => {
      // For doctors, we query by doctor_id
      if (entityType === 'doctor') {
        const { data: reviewsData, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('doctor_id', entityId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Fetch patient profiles separately
        const patientIds = (reviewsData || []).map(r => r.patient_id).filter(Boolean);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', patientIds);
        
        // Merge profiles with reviews
        return (reviewsData || []).map(review => ({
          ...review,
          profiles: profilesData?.find(p => p.id === review.patient_id) || null
        }));
      }
      
      // For other entities, we'll return empty for now (can be extended)
      return [];
    },
    enabled: !!entityId
  });

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 
      : 0
  }));

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
    : 0;

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: 'Tafadhali ingia kwanza', variant: 'destructive' });
      return;
    }
    
    if (rating === 0) {
      toast({ title: 'Chagua nyota', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (entityType === 'doctor') {
        const { error } = await supabase.from('reviews').insert({
          patient_id: user.id,
          doctor_id: entityId,
          rating,
          review_text: reviewText || null
        });
        
        if (error) throw error;
      }
      
      toast({ title: 'Asante!', description: 'Maoni yako yamehifadhiwa.' });
      setShowReviewDialog(false);
      setRating(0);
      setReviewText('');
      refetch();
    } catch (error: any) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (r: number) => {
    if (r === 1) return 'Mbaya sana';
    if (r === 2) return 'Mbaya';
    if (r === 3) return 'Wastani';
    if (r === 4) return 'Nzuri';
    if (r === 5) return 'Bora sana!';
    return 'Chagua nyota';
  };

  const renderStars = (rating: number, size = 'sm') => {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <CollapsibleSection
      title="Maoni na Tathmini"
      icon={<MessageCircle className="w-5 h-5" />}
      badge={reviews.length}
      defaultOpen={false}
    >
      <div className="space-y-4">
        {/* Rating Summary */}
        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-6">
              {/* Average Rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                  {averageRating.toFixed(1)}
                </div>
                {renderStars(Math.round(averageRating), 'md')}
                <p className="text-xs text-muted-foreground mt-1">
                  {reviews.length} maoni
                </p>
              </div>
              
              {/* Rating Distribution */}
              <div className="flex-1 space-y-1.5">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs w-4">{star}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <Progress value={percentage} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-6">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Review Button */}
        {showForm && entityType === 'doctor' && (
          <Button 
            onClick={() => setShowReviewDialog(true)}
            className="w-full"
            variant="outline"
          >
            <Star className="h-4 w-4 mr-2" />
            Andika Maoni
          </Button>
        )}

        {/* Reviews List */}
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Hakuna maoni bado</p>
              <p className="text-sm">Kuwa wa kwanza kutoa maoni</p>
            </div>
          ) : (
            reviews.slice(0, 5).map((review) => (
              <Card key={review.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-sm">
                          {review.profiles?.first_name || 'Mtumiaji'} {review.profiles?.last_name?.[0] || ''}.
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating || 0)}
                        <Badge variant="secondary" className="text-xs">
                          {getRatingLabel(review.rating || 0)}
                        </Badge>
                      </div>
                      
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          "{review.review_text}"
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {reviews.length > 5 && (
            <Button variant="ghost" className="w-full text-sm">
              Ona maoni yote ({reviews.length})
            </Button>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Tathmini {entityName}</DialogTitle>
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
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-muted-foreground/30'
                    }`} 
                  />
                </button>
              ))}
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              {getRatingLabel(hoverRating || rating)}
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
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="flex-1">
              Baadaye
            </Button>
            <Button 
              onClick={handleSubmitReview} 
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Inatuma...' : 'Tuma Tathmini'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CollapsibleSection>
  );
}

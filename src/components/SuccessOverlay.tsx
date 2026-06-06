import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface SuccessOverlayProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  autoCloseMs?: number;
}

/**
 * Full-screen Wizy-style success overlay.
 * Draws an animated tick inside a pulsing ring with floating sparkles.
 * Auto-closes after `autoCloseMs` (default 1800ms).
 */
export function SuccessOverlay({
  open,
  title = 'Imekamilika!',
  subtitle = 'Done',
  onClose,
  autoCloseMs = 1800,
}: SuccessOverlayProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, onClose, autoCloseMs]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="flex flex-col items-center gap-5 px-8">
        {/* Tick badge */}
        <div className="relative">
          {/* outer pulsing rings */}
          <span className="absolute inset-0 rounded-full bg-primary/30 success-pulse" />
          <span className="absolute inset-0 rounded-full bg-primary/20 success-pulse" style={{ animationDelay: '0.3s' }} />

          {/* sparkles */}
          <Sparkles className="absolute -top-3 -right-3 h-5 w-5 text-amber-400 success-sparkle" />
          <Sparkles className="absolute -bottom-2 -left-3 h-4 w-4 text-amber-400 success-sparkle" style={{ animationDelay: '0.2s' }} />
          <Sparkles className="absolute -top-4 left-1 h-3 w-3 text-primary success-sparkle" style={{ animationDelay: '0.4s' }} />

          {/* main circle */}
          <div className="success-ring relative h-24 w-24 rounded-full bg-gradient-to-br from-primary to-emerald-500 shadow-2xl flex items-center justify-center">
            <svg
              className="success-tick"
              width="48"
              height="48"
              viewBox="0 0 52 52"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 27 L23 36 L40 17" />
            </svg>
          </div>
        </div>

        {/* Wizy text */}
        <div className="text-center animate-slide-up">
          <p className="text-xl font-bold text-foreground">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default SuccessOverlay;

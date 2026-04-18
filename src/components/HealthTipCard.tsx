import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, ChevronRight } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
}

export function HealthTipCard({ className = '' }: { className?: string }) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase
      .from('ai_health_tips')
      .select('id, title, content, category')
      .eq('is_active', true)
      .eq('is_approved', true)
      .limit(20)
      .then(({ data }) => {
        const list = data || [];
        // shuffle
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        setTips(list);
      });
  }, []);

  useEffect(() => {
    if (tips.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % tips.length), 8000);
    return () => clearInterval(t);
  }, [tips.length]);

  if (tips.length === 0) return null;
  const tip = tips[idx];

  return (
    <button
      onClick={() => setIdx(i => (i + 1) % tips.length)}
      className={`w-full text-left rounded-2xl border border-border bg-card p-3 flex items-start gap-3 hover:border-primary/40 transition ${className}`}
    >
      <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
        <Lightbulb className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{tip.title}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{tip.content}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}

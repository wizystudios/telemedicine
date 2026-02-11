import { ReactNode, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableSectionProps {
  title: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  sheetHeight?: string;
}

/**
 * A section header that shows title + count. 
 * When clicked, opens a bottom sheet with all items.
 * No preview items are shown — just the clickable header.
 */
export function ExpandableSection({ 
  title, 
  count, 
  icon, 
  children, 
  className,
  sheetHeight = 'h-[85vh]'
}: ExpandableSectionProps) {
  if (count === 0) return null;

  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border overflow-hidden", className)}>
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-primary">{icon}</span>
              <span className="font-semibold text-foreground">{title}</span>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
                {count}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className={`${sheetHeight} rounded-t-3xl`}>
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              {icon}
              {title} ({count})
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100%-60px)] pr-2">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

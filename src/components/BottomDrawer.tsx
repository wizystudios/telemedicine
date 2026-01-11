import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface BottomDrawerProps {
  title: string;
  triggerText: string;
  children: ReactNode;
  itemCount?: number;
  previewCount?: number;
  previewContent?: ReactNode;
  icon?: ReactNode;
}

export function BottomDrawer({ 
  title, 
  triggerText, 
  children, 
  itemCount = 0, 
  previewCount = 3,
  previewContent,
  icon
}: BottomDrawerProps) {
  const hasMore = itemCount > previewCount;

  return (
    <div className="space-y-3">
      {/* Preview Content */}
      {previewContent}
      
      {/* View All Button */}
      {hasMore && (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 text-primary"
            >
              {icon}
              {triggerText} ({itemCount})
              <ChevronDown className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                {icon}
                {title} ({itemCount})
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100%-60px)] pr-2">
              {children}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

// Utility component to show limited items with "View All" button
interface LimitedListProps<T> {
  items: T[];
  limit?: number;
  title: string;
  icon?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  renderAllItems?: (items: T[]) => ReactNode;
  className?: string;
}

export function LimitedList<T>({ 
  items, 
  limit = 3, 
  title, 
  icon,
  renderItem,
  renderAllItems,
  className
}: LimitedListProps<T>) {
  const displayItems = items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <div className={className}>
      {/* Show limited items */}
      <div className="space-y-2">
        {displayItems.map((item, index) => renderItem(item, index))}
      </div>
      
      {/* View All Button */}
      {hasMore && (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full mt-3 flex items-center justify-center gap-2"
            >
              {icon}
              Ona Zote ({items.length})
              <ChevronDown className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                {icon}
                {title} ({items.length})
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100%-60px)] pr-2 space-y-2">
              {renderAllItems 
                ? renderAllItems(items)
                : items.map((item, index) => renderItem(item, index))
              }
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

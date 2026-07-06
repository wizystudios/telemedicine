import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

/**
 * App-wide error boundary. Catches render errors in any route so users see a
 * friendly retry screen instead of a blank white page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface for debugging in preview + production consoles
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Kuna tatizo kidogo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ukurasa huu umekwama. Jaribu tena au rudi nyumbani.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-2 break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" /> Jaribu tena
            </Button>
            <Button onClick={this.handleReload} className="flex-1">
              Anzisha upya
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={this.handleHome} className="w-full">
            <Home className="h-4 w-4 mr-2" /> Rudi Nyumbani
          </Button>
        </div>
      </div>
    );
  }
}

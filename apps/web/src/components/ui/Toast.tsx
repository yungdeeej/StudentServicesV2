import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon.js';
import { cn } from './cn.js';

type Tone = 'default' | 'success' | 'danger' | 'warn';

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
};

type ToastApi = {
  toast: (input: { title: string; description?: string; tone?: Tone; durationMs?: number }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const toast: ToastApi['toast'] = ({ title, description, tone = 'default', durationMs = 4000 }) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), durationMs);
    };
    return {
      toast,
      success: (title, description) => toast({ title, description, tone: 'success' }),
      error: (title, description) => toast({ title, description, tone: 'danger' }),
    };
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto bg-surface-2 border rounded-xl shadow-elevated p-4 animate-slideUp',
              t.tone === 'success' && 'border-success/40',
              t.tone === 'danger' && 'border-danger/40',
              t.tone === 'warn' && 'border-warn/40',
              t.tone === 'default' && 'border-border',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5',
                  t.tone === 'success' && 'text-success',
                  t.tone === 'danger' && 'text-danger',
                  t.tone === 'warn' && 'text-warn',
                  t.tone === 'default' && 'text-accent',
                )}
              >
                <Icon name={t.tone === 'success' ? 'check' : t.tone === 'danger' ? 'alert' : 'bell'} size={16} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">{t.title}</div>
                {t.description && <div className="text-xs text-muted mt-1">{t.description}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted hover:text-ink"
                aria-label="Dismiss"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

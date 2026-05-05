import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn.js';

const FIELD =
  'w-full bg-bg border border-border rounded-lg px-3 text-sm text-ink placeholder:text-muted ' +
  'focus:border-accent focus:outline-none transition-colors disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode;
}>(function Input({ className, leftIcon, ...rest }, ref) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{leftIcon}</span>
      )}
      <input
        ref={ref}
        {...rest}
        className={cn(FIELD, 'h-10', leftIcon && 'pl-9', className)}
      />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        {...rest}
        className={cn(FIELD, 'py-2.5 leading-relaxed resize-none', className)}
      />
    );
  },
);

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      {...rest}
      className={cn(FIELD, 'h-10 pr-8 appearance-none bg-no-repeat bg-right', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg width='12' height='12' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 12px center',
      }}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="block">
      <div className="text-xs font-medium text-zinc-300 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </div>
      {children}
      {hint && !error && <div className="text-xs text-muted mt-1.5">{hint}</div>}
      {error && <div className="text-xs text-danger mt-1.5">{error}</div>}
    </label>
  );
}

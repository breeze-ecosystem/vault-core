'use client';

import { cn } from '@/src/lib/utils';

type FormFieldProps = {
  label: string;
  name: string;
  type: 'text' | 'email' | 'textarea';
  placeholder: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onBlur?: (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
};

export function FormField({
  label,
  name,
  type,
  placeholder,
  required = false,
  error,
  value,
  onChange,
  onBlur,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const inputId = `field-${name}`;

  const inputClasses = cn(
    'w-full rounded-lg border px-4 py-3 transition-colors duration-200 ease-out',
    'bg-white/5 border-white/10 text-white placeholder:text-white/40',
    'focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30',
    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
  );

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-white/80">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={inputId}
          name={name}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          rows={5}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className={inputClasses}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className={inputClasses}
        />
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

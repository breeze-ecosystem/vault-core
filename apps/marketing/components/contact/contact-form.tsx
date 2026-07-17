'use client';

import { useState, useRef, useCallback } from 'react';
import { FormField } from '@/components/contact/form-field';
import { TurnstileWidget, type TurnstileWidgetHandle } from '@/components/contact/turnstile-widget';
import { SuccessMessage } from '@/components/contact/success-message';
import { ErrorMessage } from '@/components/contact/error-message';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Button } from '@/components/ui/button';
import { submitContact } from '@/src/lib/contact';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'This field is required';
    }

    if (!email.trim()) {
      errors.email = 'This field is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!message.trim()) {
      errors.message = 'This field is required';
    } else if (message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, message]);

  const handleBlur = useCallback(
    (field: string) => {
      return () => {
        const errors: Record<string, string> = {};

        if (field === 'email' && email && !validateEmail(email)) {
          errors.email = 'Please enter a valid email address';
        }

        setFieldErrors((prev) => ({ ...prev, ...errors }));
      };
    },
    [email],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    if (!token) {
      setErrorMessage('Verification failed. Please try again.');
      return;
    }

    setStatus('loading');

    try {
      await submitContact({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        message: message.trim(),
        turnstileToken: token,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(message);
      turnstileRef.current?.reset();
      setToken('');
    }
  };

  if (status === 'success') {
    return <SuccessMessage />;
  }

  const isRateLimited = errorMessage.includes('Too many requests');

  return (
    <GlassPanel className="p-8">
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {errorMessage && status === 'error' && (
        <div className="mb-4">
          <ErrorMessage
            message={
              isRateLimited
                ? 'Too many requests. Please try again later.'
                : `Something went wrong. Please try again or email us at hello@oversighthub.com.`
            }
            onDismiss={
              !isRateLimited
                ? () => {
                    setStatus('idle');
                    setErrorMessage('');
                  }
                : undefined
            }
          />
        </div>
      )}

      <FormField
        label="Name"
        name="name"
        type="text"
        placeholder="Your full name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="you@company.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleBlur('email')}
        error={fieldErrors.email}
      />

      <FormField
        label="Company (optional)"
        name="company"
        type="text"
        placeholder="Company name"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />

      <FormField
        label="Message"
        name="message"
        type="textarea"
        placeholder="Tell us about your security needs..."
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={fieldErrors.message}
      />

      <div className="flex justify-center">
        <TurnstileWidget
          ref={turnstileRef}
          onToken={setToken}
          onError={() => {
            setErrorMessage('Verification failed. Please try again.');
          }}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={status === 'loading'}
        isLoading={status === 'loading'}
      >
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </Button>

      <p className="text-center text-sm text-white/40">
        Or email us directly:{' '}
        <a
          href="mailto:hello@oversighthub.com"
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          hello@oversighthub.com
        </a>
      </p>
    </form>
    </GlassPanel>
  );
}

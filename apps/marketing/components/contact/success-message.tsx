import { CheckCircle2 } from 'lucide-react';

export function SuccessMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-white">Message sent!</h2>
      <p className="mt-3 max-w-md text-white/60">
        Thank you for reaching out. Our team will contact you within 24 hours.
      </p>
    </div>
  );
}

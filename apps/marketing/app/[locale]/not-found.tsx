import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-display mb-4 text-foreground">Page not found</h1>
      <p className="text-muted mb-8 text-lg">
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg px-6 py-3 font-semibold transition-colors"
      >
        Back to Home
      </a>
    </div>
  );
}

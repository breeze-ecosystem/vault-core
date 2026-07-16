'use client';

import { useState } from 'react';
import { cn } from '@/src/lib/utils';

export function BlogShareLinks() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleTwitterShare = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Share this post</span>

      <div className="flex gap-1">
        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className={cn(
            'inline-flex items-center justify-center rounded-lg p-2 text-sm transition-colors',
            copied
              ? 'bg-success/10 text-success'
              : 'text-muted hover:text-foreground hover:bg-secondary',
          )}
          aria-label={copied ? 'Link copied' : 'Copy link'}
        >
          {copied ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
        </button>

        {/* LinkedIn */}
        <button
          onClick={handleLinkedInShare}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted transition-colors hover:text-foreground hover:bg-secondary"
          aria-label="Share on LinkedIn"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        </button>

        {/* Twitter/X */}
        <button
          onClick={handleTwitterShare}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted transition-colors hover:text-foreground hover:bg-secondary"
          aria-label="Share on Twitter / X"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

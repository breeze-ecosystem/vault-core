import type { ReactElement } from 'react';

/**
 * JSON-LD structured data helpers.
 * Each returns a <script type="application/ld+json"> element.
 * Standard Schema.org patterns per UI-SPEC D-25 and RESEARCH.md lines 720-741.
 */

type JsonLdProps = {
  schema: Record<string, unknown>;
};

function JsonLd({ schema }: JsonLdProps): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Organization ────────────────────────────────────────────

export function OrganizationJsonLd(): ReactElement {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Oversight AI',
    url: 'https://oversighthub.com',
    logo: 'https://oversighthub.com/logo.png',
    description: 'AI-powered physical security intelligence platform',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@oversighthub.com',
      contactType: 'sales',
    },
    sameAs: [
      // Social profiles — add as they are created
    ],
  };

  return <JsonLd schema={schema} />;
}

// ─── SoftwareApplication ─────────────────────────────────────

export function SoftwareApplicationJsonLd(): ReactElement {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Oversight Hub',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Linux',
    description:
      'AI-powered physical security intelligence platform unifying video surveillance, access control, and operational security.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        description: 'For small teams getting started with intelligent security.',
        price: '0',
        priceCurrency: 'USD',
      },
      {
        '@type': 'Offer',
        name: 'Professional',
        description: 'For growing organizations needing advanced features and higher limits.',
        price: '0',
        priceCurrency: 'USD',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise',
        description: 'For large organizations requiring unlimited devices and priority support.',
        price: '0',
        priceCurrency: 'USD',
      },
    ],
  };

  return <JsonLd schema={schema} />;
}

// ─── WebSite ─────────────────────────────────────────────────

export function WebSiteJsonLd(): ReactElement {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OVERSIGHT AI',
    url: 'https://oversighthub.com',
    description: 'AI-powered physical security intelligence platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://oversighthub.com/{locale}/blog?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <JsonLd schema={schema} />;
}

// ─── WebPage ─────────────────────────────────────────────────

export function WebPageJsonLd({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}): ReactElement {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://oversighthub.com',
        },
      ],
    },
  };

  return <JsonLd schema={schema} />;
}

// ─── BlogPosting ─────────────────────────────────────────────

export function BlogPostingJsonLd({
  headline,
  datePublished,
  dateModified,
  author,
  image,
  description,
}: {
  headline: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  image?: string;
  description: string;
}): ReactElement {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    datePublished,
    author: {
      '@type': 'Person',
      name: author,
    },
  };

  if (dateModified) {
    schema.dateModified = dateModified;
  }

  if (image) {
    schema.image = image;
  }

  return <JsonLd schema={schema} />;
}

// ─── FAQPage ─────────────────────────────────────────────────

export function FAQPageJsonLd({
  questions,
}: {
  questions: { question: string; answer: string }[];
}): ReactElement {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return <JsonLd schema={schema} />;
}

// ─── BreadcrumbList ──────────────────────────────────────────

export function BreadcrumbListJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}): ReactElement {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd schema={schema} />;
}

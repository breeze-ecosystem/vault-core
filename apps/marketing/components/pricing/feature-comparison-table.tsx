'use client';

import { Fragment } from 'react';
import { Check } from 'lucide-react';

export interface FeatureRow {
  feature: string;
  starter: string;
  professional: string;
  enterprise: string;
}

export interface FeatureGroup {
  label: string;
  rows: FeatureRow[];
}

export const featureGroups: FeatureGroup[] = [
  {
    label: 'Platform Limits',
    rows: [
      {
        feature: 'Cameras',
        starter: 'Up to 25',
        professional: 'Up to 100',
        enterprise: 'Unlimited',
      },
      {
        feature: 'Doors',
        starter: 'Up to 25',
        professional: 'Up to 100',
        enterprise: 'Unlimited',
      },
      {
        feature: 'Users',
        starter: 'Up to 10',
        professional: 'Up to 50',
        enterprise: 'Unlimited',
      },
    ],
  },
  {
    label: 'AI & Analytics',
    rows: [
      {
        feature: 'AI-Powered Video Analytics',
        starter: '✓',
        professional: '✓',
        enterprise: '✓',
      },
      {
        feature: 'Real-Time Alerts',
        starter: '✓',
        professional: '✓',
        enterprise: '✓',
      },
      {
        feature: 'Audit Logs & Event Journal',
        starter: '✓',
        professional: '✓',
        enterprise: '✓',
      },
    ],
  },
  {
    label: 'Integrations',
    rows: [
      {
        feature: 'Mobile App Access',
        starter: '✓',
        professional: '✓',
        enterprise: '✓',
      },
      {
        feature: 'Custom Integrations',
        starter: '—',
        professional: '✓',
        enterprise: '✓',
      },
      {
        feature: 'SSO / SAML',
        starter: '—',
        professional: '—',
        enterprise: '✓',
      },
    ],
  },
  {
    label: 'Security & Compliance',
    rows: [
      {
        feature: 'On-Premise Deployment',
        starter: '✓',
        professional: '✓',
        enterprise: '✓',
      },
    ],
  },
  {
    label: 'Support',
    rows: [
      {
        feature: 'Priority Support',
        starter: '—',
        professional: '✓',
        enterprise: '✓',
      },
      {
        feature: 'Dedicated Support Engineer',
        starter: '—',
        professional: '—',
        enterprise: '✓',
      },
    ],
  },
];

function FeatureCell({ value }: { value: string }) {
  if (value === '✓') {
    return (
      <Check className="mx-auto h-5 w-5 text-success" aria-label="Included" />
    );
  }
  if (value === '—') {
    return (
      <span className="block text-center text-muted-light" aria-label="Not included">
        —
      </span>
    );
  }
  return <span className="block text-center text-sm text-foreground">{value}</span>;
}

export function FeatureComparisonTable() {
  if (featureGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted">
        No features to compare.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="sticky top-0 z-10 bg-secondary/50 px-6 py-4 text-sm font-semibold text-foreground backdrop-blur">
              Feature
            </th>
            <th className="sticky top-0 z-10 bg-secondary/50 px-6 py-4 text-center text-sm font-semibold text-foreground backdrop-blur">
              Starter
            </th>
            <th className="sticky top-0 z-10 bg-secondary/50 px-6 py-4 text-center text-sm font-semibold text-foreground backdrop-blur">
              Professional
            </th>
            <th className="sticky top-0 z-10 bg-secondary/50 px-6 py-4 text-center text-sm font-semibold text-foreground backdrop-blur">
              Enterprise
            </th>
          </tr>
        </thead>
        <tbody>
          {featureGroups.map((group) => (
            <Fragment key={group.label}>
              <tr className="border-b border-border bg-muted/30">
                <td
                  colSpan={4}
                  className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  {group.label}
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border transition-colors last:border-0 hover:bg-secondary/30"
                >
                  <td className="px-6 py-4 text-sm text-foreground">
                    {row.feature}
                  </td>
                  <td className="px-6 py-4">
                    <FeatureCell value={row.starter} />
                  </td>
                  <td className="px-6 py-4">
                    <FeatureCell value={row.professional} />
                  </td>
                  <td className="px-6 py-4">
                    <FeatureCell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

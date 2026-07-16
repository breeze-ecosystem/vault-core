export interface Limits {
  cameras: number | 'Unlimited';
  doors: number | 'Unlimited';
  users: number | 'Unlimited';
}

export interface TierData {
  id: 'starter' | 'professional' | 'enterprise';
  name: string;
  description: string;
  badge?: string;
  ctaLabel: string;
  ctaVariant: 'primary' | 'secondary';
  highlighted: boolean;
  features: string[];
  limits: Limits;
}

export const tiers: TierData[] = [
  {
    id: 'starter',
    name: 'Starter',
    description:
      'For small teams getting started with intelligent security.',
    ctaLabel: 'Book a Demo',
    ctaVariant: 'primary',
    highlighted: false,
    limits: {
      cameras: 25,
      doors: 25,
      users: 10,
    },
    features: [
      'AI-powered video analytics',
      'Real-time alerts & notifications',
      'Mobile app access',
      'Audit logs & event journal',
      'Up to 25 cameras',
      'Up to 25 doors',
      'On-premise deployment option',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most Popular',
    description:
      'For growing organizations needing advanced features and higher limits.',
    ctaLabel: 'Book a Demo',
    ctaVariant: 'primary',
    highlighted: true,
    limits: {
      cameras: 100,
      doors: 100,
      users: 50,
    },
    features: [
      'Everything in Starter, plus:',
      'AI-powered video analytics',
      'Real-time alerts & notifications',
      'Mobile app access',
      'Audit logs & event journal',
      'Up to 100 cameras',
      'Up to 100 doors',
      'Custom integrations',
      'Priority support',
      'On-premise deployment option',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description:
      'For large organizations requiring unlimited devices and priority support.',
    ctaLabel: 'Contact Sales',
    ctaVariant: 'secondary',
    highlighted: false,
    limits: {
      cameras: 'Unlimited',
      doors: 'Unlimited',
      users: 'Unlimited',
    },
    features: [
      'Everything in Professional, plus:',
      'Unlimited cameras',
      'Unlimited doors',
      'Unlimited users',
      'Custom integrations',
      'SSO / SAML',
      'Priority support',
      'Dedicated support engineer',
      'On-premise deployment option',
    ],
  },
];

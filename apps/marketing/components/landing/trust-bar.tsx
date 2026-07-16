import { Container } from '@/components/layout/container';

const LOGOS = [
  'TechCorp',
  'SecureGlobal',
  'DataGuard',
  'InfraSafe',
  'NexusSec',
  'PrimeShield',
];

export function TrustBar() {
  return (
    <section className="border-b border-border bg-white py-12">
      <Container>
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
          Trusted by industry leaders
        </p>

        {/* Desktop: static grid */}
        <div className="hidden items-center justify-center gap-12 md:flex">
          {LOGOS.map((name) => (
            <div
              key={name}
              className="flex h-10 items-center grayscale transition-all duration-300 hover:grayscale-0"
            >
              <div className="flex h-10 w-24 items-center justify-center rounded-md bg-muted/50 px-4">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                  {name}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: auto-scroll carousel */}
        <div className="overflow-hidden md:hidden">
          <div className="flex animate-scroll gap-8">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex h-10 w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted/50 px-4 grayscale transition-all duration-300 hover:grayscale-0"
              >
                <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

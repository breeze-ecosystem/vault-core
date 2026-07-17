import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/layout/container';

export async function TrustBar() {
  const t = await getTranslations('hero');

  return (
    <section className="bg-[#070912] py-12">
      <Container>
        <p className="text-center text-sm tracking-wide uppercase text-[#64748b]">
          {t('trustBar')}
        </p>
      </Container>
    </section>
  );
}

import { ProductCard } from './product-card';
import { AnimatedSection } from '@/components/ui/animated-section';
import type { ReactNode } from 'react';

interface Product {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <AnimatedSection>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {products.map((product, index) => (
          <ProductCard
            key={product.href}
            title={product.title}
            description={product.description}
            href={product.href}
            icon={product.icon}
            index={index}
          />
        ))}
      </div>
    </AnimatedSection>
  );
}

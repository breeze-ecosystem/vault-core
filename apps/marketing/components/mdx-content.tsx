'use client';

import * as runtime from 'react/jsx-runtime';

const useMDXComponent = (code: string) => {
  // eslint-disable-next-line no-new-func
  const fn = new Function(code);
  return fn({ ...runtime }).default;
};

interface MDXContentProps {
  code: string;
  components?: Record<string, React.ComponentType>;
}

export function MDXContent({ code, components }: MDXContentProps) {
  const Component = useMDXComponent(code);
  return <Component components={{ ...components }} />;
}

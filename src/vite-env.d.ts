/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'lucide-react/dist/esm/icons/*' {
  import type { LucideProps } from 'lucide-react';
  import type { ForwardRefExoticComponent, RefAttributes } from 'react';
  const Component: ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;
  export default Component;
}


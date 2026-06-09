import type { ReactNode } from 'react';

export const metadata = { title: 'Checkout Seguro – Licitah' };

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F7', fontFamily: 'inherit' }}>
      {children}
    </div>
  );
}

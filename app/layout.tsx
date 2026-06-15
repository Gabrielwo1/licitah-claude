import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Licitah — Plataforma de Licitações',
  description: 'Monitore licitações do governo federal em tempo real.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Providers } from '@/components/features/Providers';
import { Header } from '@/components/features/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fracture - Split Bills Easily',
  description: 'A simple bill splitting app for groups',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

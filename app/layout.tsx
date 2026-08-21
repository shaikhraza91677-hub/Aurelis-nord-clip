import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aurelis Nord Clip — AI video repurposing',
  description: 'Turn long videos into high-retention short clips with captions.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
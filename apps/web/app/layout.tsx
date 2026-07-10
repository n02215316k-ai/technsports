import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Header } from '@/components/header';
import './globals.css';
import './profiles.css';
import './directories.css';
import './functional.css';
import './collector.css';
import './entry.css';
import './admin.css';
import './contributors.css';
import './editor.css';
import './upload.css';
import './offline.css';
import './transfer-contribute.css';
import './cta.css';
import './auth.css';
import './form-guide.css';
import './opta.css';
import './roles.css';
import './tickets.css';
import './mobile-collector.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'TechnSports — Zimbabwe Football Intelligence',
  description: 'Live scores, advanced statistics and verified football data from Zimbabwe.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body className={`${inter.variable} ${display.variable}`}><Header/>{children}<footer><div className="brand footer-brand">TECHN<span>SPORTS</span></div><p>Independent football data for Zimbabwe. Built with the community.</p><span>© 2026 TechnSports</span></footer></body></html>;
}

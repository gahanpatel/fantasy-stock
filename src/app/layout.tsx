import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'TamidTrades',
  description: 'Fantasy Stock League — compete smarter, not just luckier.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('tt_dark')==='1')document.documentElement.classList.add('dark')}catch(_){}` }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

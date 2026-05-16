import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Viral Shortform Editor — AI-powered Reels, TikTok & Shorts',
  description:
    'Verwandle Rohmaterial in virale Shortform-Clips. Auto-Cut, AI-Captions, Face-Tracking, Reframing — direkt im Browser, 100% kostenlos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#12121a',
              border: '1px solid #252533',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}

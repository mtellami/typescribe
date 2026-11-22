import type { Metadata } from 'next';
import './globals.css';
import {
  Geist,
  Be_Vietnam_Pro,
  Roboto_Mono,
  Quicksand,
  Playpen_Sans,
} from 'next/font/google';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const practiceFont = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-vietnam',
  weight: ['400', '500', '600', '700'],
});

const monoFont = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});
const roundedFont = Quicksand({
  subsets: ['latin'],
  variable: '--font-quicksand',
});
const handwrittenFont = Playpen_Sans({
  subsets: ['latin'],
  variable: '--font-playpen',
});

export const metadata: Metadata = {
  title: 'Typescribe',
  description: 'Practice typing captions from YouTube videos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'dark',
        'font-sans',
        geist.variable,
        practiceFont.variable,
        monoFont.variable,
        roundedFont.variable,
        handwrittenFont.variable,
      )}
    >
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}

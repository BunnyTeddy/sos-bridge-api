import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { TelegramProvider } from '@/hooks/useTelegram';
import { QueryProvider } from '@/lib/query-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const font = Space_Grotesk({ 
  subsets: ['latin', 'vietnamese'],
  variable: '--font-space',
});

export const metadata: Metadata = {
  title: 'SOS-Bridge | Emergency Rescue',
  description: 'AI-powered Flood Rescue Application',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ef4444',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={font.variable}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <TelegramProvider>
              <main className="flex min-h-screen flex-col">
                {children}
              </main>
            </TelegramProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

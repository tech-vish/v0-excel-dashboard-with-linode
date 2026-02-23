import type { Metadata, Viewport } from 'next'
import { Outfit, IBM_Plex_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import Image from 'next/image'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
})

export const metadata: Metadata = {
  title: 'Indian Art Villa - Financial Dashboard',
  description: 'Financial data dashboard with Excel upload and Linode S3 integration',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0d11',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Ideate Consultancy fixed badge - bottom right */}
          <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 bg-[var(--surface,#1a1d24)] border border-[var(--border,rgba(255,255,255,0.08))] rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity">
            <Image src="/ideate.jpeg" alt="Ideate Consultancy" width={82} height={82} className="rounded-lg object-contain" />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Presented by Ideate Consultancy</span>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://benmross.com'),
  title: {
    default: 'Ben Ross — Developer & Builder',
    template: '%s — Ben Ross',
  },
  description:
    'Ben Ross is an incoming University of Maryland computer science freshman building intelligent software, physical systems, and useful tools.',
  keywords: ['Ben Ross', 'developer', 'AI', 'robotics', 'software engineer', 'portfolio'],
  authors: [{ name: 'Ben Ross' }],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Ben Ross — Developer & Builder',
    description: 'Software with a pulse. Systems with a purpose.',
    url: 'https://benmross.com',
    siteName: 'Ben Ross',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ben Ross — Developer & Builder',
    description: 'Software with a pulse. Systems with a purpose.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

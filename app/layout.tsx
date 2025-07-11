import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ben Ross - Developer & Photographer',
  description: '16-year-old high school student crafting digital experiences through code and capturing moments through photography. Building the future, one pixel at a time.',
  keywords: ['Ben Ross', 'Developer', 'Photographer', 'Web Development', 'Photography', 'High School Student', 'Programmer'],
  authors: [{ name: 'Ben Ross' }],
  creator: 'Ben Ross',
  publisher: 'Ben Ross',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://benross.dev'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Ben Ross - Developer & Photographer',
    description: '16-year-old high school student crafting digital experiences through code and capturing moments through photography.',
    url: 'https://benross.dev',
    siteName: 'Ben Ross Portfolio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ben Ross - Developer & Photographer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ben Ross - Developer & Photographer',
    description: '16-year-old high school student crafting digital experiences through code and capturing moments through photography.',
    images: ['/og-image.jpg'],
    creator: '@benross',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.className} antialiased min-h-screen`}>
        <Navigation />
        <main className="relative">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-white mb-2">Ben Ross</h3>
                  <p className="text-white/70">Developer & Photographer</p>
                </div>
                
                <div className="flex space-x-6">
                  <a 
                    href="https://github.com/benross" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                  <a 
                    href="https://instagram.com/benross" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                  <a 
                    href="https://linkedin.com/in/benross" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <p className="text-white/60 text-sm">
                  © {new Date().getFullYear()} Ben Ross. All rights reserved. Built with Next.js and Tailwind CSS.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
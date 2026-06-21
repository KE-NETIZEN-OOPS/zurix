import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZuriX — Beautiful Connections. No Limits.',
  description: 'Meet, connect, and vibe with people near you and across the world.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}

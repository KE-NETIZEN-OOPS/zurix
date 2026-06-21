import Navbar from '@/components/ui/Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-56 pb-16 md:pb-0 min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

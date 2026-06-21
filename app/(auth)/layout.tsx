export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-center mb-8"><span className="text-amber-500">Zuri</span>X</h1>
        {children}
      </div>
    </div>
  )
}

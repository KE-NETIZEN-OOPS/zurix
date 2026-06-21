import Link from 'next/link'
import TierCard from '@/components/payments/TierCard'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
          <span className="text-amber-500">Zuri</span>X
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 max-w-xl mb-2">Beautiful connections. No limits.</p>
        <p className="text-zinc-500 mb-8 max-w-md">Meet locals and chat with people from around the world. Explore profiles, go live, and unlock exclusive content.</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/register" className="bg-amber-500 text-black font-bold px-8 py-3 rounded-full text-lg hover:bg-amber-400 transition">Join Free</Link>
          <Link href="/explore" className="border border-zinc-700 text-white px-8 py-3 rounded-full text-lg hover:bg-zinc-800 transition">Browse Profiles</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 py-6">
        <div className="max-w-4xl mx-auto flex justify-around text-center px-4">
          {[['508+', 'Profiles'], ['Kenya & Beyond', 'Members from'], ['Live Streaming', 'Feature']].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-amber-500">{val}</div>
              <div className="text-zinc-500 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-2">Simple pricing</h2>
        <p className="text-zinc-400 text-center mb-10">Unlock more with every tier. Cancel anytime.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <TierCard tier="flame" />
          <TierCard tier="blaze" highlighted />
          <TierCard tier="inferno" />
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-600 text-sm">
        © 2026 ZuriX · Kenya · All rights reserved · 18+ only
      </footer>
    </main>
  )
}

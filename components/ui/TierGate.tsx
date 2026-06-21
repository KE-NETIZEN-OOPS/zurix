import Link from 'next/link'
import { hasAccess, tierLabel, type Tier } from '@/lib/tiers'

interface Props {
  userTier: Tier
  required: Tier
  children: React.ReactNode
}

export default function TierGate({ userTier, required, children }: Props) {
  if (hasAccess(userTier, required)) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="text-5xl">🔒</div>
      <h2 className="text-xl font-bold text-white">{tierLabel(required)} tier required</h2>
      <p className="text-zinc-400 max-w-xs">Upgrade your plan to unlock this feature.</p>
      <Link href="/payments" className="bg-amber-500 text-black font-bold px-6 py-3 rounded-full hover:bg-amber-400 transition">
        Upgrade Now
      </Link>
    </div>
  )
}

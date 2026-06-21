import Link from 'next/link'
import { TIER_PRICES, tierLabel, type Tier } from '@/lib/tiers'
import clsx from 'clsx'

const TIER_FEATURES: Record<Exclude<Tier, 'free'>, string[]> = {
  flame:   ['Unlimited likes', 'Follow users', 'Direct messages', 'Post photos'],
  blaze:   ['Everything in Flame', 'Stories', 'Spicy content feed', 'Adult video section'],
  inferno: ['Everything in Blaze', 'Watch & go live', 'Chaturbate featured rooms', 'Hide my data', 'Verified badge'],
}

export default function TierCard({ tier, highlighted }: { tier: Exclude<Tier, 'free'>; highlighted?: boolean }) {
  const prices = TIER_PRICES[tier]
  return (
    <div className={clsx('rounded-2xl border p-6 flex flex-col gap-4',
      highlighted ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900')}>
      {highlighted && <span className="text-xs font-bold bg-amber-500 text-black px-2 py-1 rounded-full w-fit">MOST POPULAR</span>}
      <h3 className="text-xl font-bold text-white">{tierLabel(tier)}</h3>
      <div>
        <span className="text-3xl font-bold text-amber-500">KES {prices.monthly}</span>
        <span className="text-zinc-400 text-sm">/month</span>
      </div>
      <p className="text-zinc-500 text-sm">or KES {prices.annual}/year (2 months free)</p>
      <ul className="flex flex-col gap-2 text-sm text-zinc-300">
        {TIER_FEATURES[tier].map(f => (
          <li key={f} className="flex items-center gap-2"><span className="text-amber-500">✓</span>{f}</li>
        ))}
      </ul>
      <Link href={`/payments?tier=${tier}`}
        className={clsx('mt-auto text-center font-bold py-3 rounded-full transition',
          highlighted ? 'bg-amber-500 text-black hover:bg-amber-400' : 'border border-zinc-700 text-white hover:bg-zinc-800')}>
        Get {tierLabel(tier)}
      </Link>
    </div>
  )
}

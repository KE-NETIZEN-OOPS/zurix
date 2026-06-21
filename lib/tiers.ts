export type Tier = 'free' | 'flame' | 'blaze' | 'inferno'

const TIER_RANK: Record<Tier, number> = {
  free: 0, flame: 1, blaze: 2, inferno: 3,
}

export const TIER_PRICES: Record<Exclude<Tier, 'free'>, { monthly: number; annual: number }> = {
  flame:   { monthly: 299,  annual: 2990 },
  blaze:   { monthly: 499,  annual: 4990 },
  inferno: { monthly: 999,  annual: 9990 },
}

export function hasAccess(userTier: Tier, required: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required]
}

export function tierLabel(tier: Tier): string {
  const labels: Record<Tier, string> = {
    free: 'Free', flame: 'Flame', blaze: 'Blaze', inferno: 'Inferno',
  }
  return labels[tier]
}

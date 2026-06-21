import { describe, it, expect } from 'vitest'
import { hasAccess, tierLabel, TIER_PRICES } from '@/lib/tiers'

describe('hasAccess', () => {
  it('free cannot access flame', () => expect(hasAccess('free', 'flame')).toBe(false))
  it('flame can access flame', () => expect(hasAccess('flame', 'flame')).toBe(true))
  it('blaze can access flame', () => expect(hasAccess('blaze', 'flame')).toBe(true))
  it('inferno can access everything', () => {
    expect(hasAccess('inferno', 'free')).toBe(true)
    expect(hasAccess('inferno', 'flame')).toBe(true)
    expect(hasAccess('inferno', 'blaze')).toBe(true)
    expect(hasAccess('inferno', 'inferno')).toBe(true)
  })
  it('blaze cannot access inferno', () => expect(hasAccess('blaze', 'inferno')).toBe(false))
})

describe('tierLabel', () => {
  it('returns correct labels', () => {
    expect(tierLabel('free')).toBe('Free')
    expect(tierLabel('flame')).toBe('Flame')
    expect(tierLabel('blaze')).toBe('Blaze')
    expect(tierLabel('inferno')).toBe('Inferno')
  })
})

describe('TIER_PRICES', () => {
  it('has correct KES prices', () => {
    expect(TIER_PRICES.flame.monthly).toBe(299)
    expect(TIER_PRICES.flame.annual).toBe(2990)
    expect(TIER_PRICES.blaze.monthly).toBe(499)
    expect(TIER_PRICES.blaze.annual).toBe(4990)
    expect(TIER_PRICES.inferno.monthly).toBe(999)
    expect(TIER_PRICES.inferno.annual).toBe(9990)
  })
  it('annual saves vs monthly', () => {
    for (const tier of ['flame', 'blaze', 'inferno'] as const) {
      expect(TIER_PRICES[tier].annual).toBeLessThan(TIER_PRICES[tier].monthly * 12)
    }
  })
})

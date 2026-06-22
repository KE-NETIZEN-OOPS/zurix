export type Tier = 'free' | 'flame' | 'blaze' | 'inferno'

const TIER_RANK: Record<Tier, number> = {
  free: 0, flame: 1, blaze: 2, inferno: 3,
}

export const TIER_PRICES: Record<Exclude<Tier, 'free'>, { monthly: number; annual: number }> = {
  flame:   { monthly: 299,  annual: 2990 },
  blaze:   { monthly: 499,  annual: 4990 },
  inferno: { monthly: 999,  annual: 9990 },
}

// Moderate DM quota scheme. Infinity = unlimited (Inferno).
export const DM_LIMITS: Record<Tier, { newChatsPerDay: number; messagesPerDay: number }> = {
  free:    { newChatsPerDay: 0,        messagesPerDay: 0 },
  flame:   { newChatsPerDay: 10,       messagesPerDay: 100 },
  blaze:   { newChatsPerDay: 30,       messagesPerDay: 500 },
  inferno: { newChatsPerDay: Infinity, messagesPerDay: Infinity },
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

// Preset profile themes. `name` is stored on users.theme.
export interface ThemeDef { label: string; bg: string; card: string; border: string; accent: string; text: string; muted: string }
export const THEMES: Record<string, ThemeDef> = {
  dark:     { label: 'Midnight Amber', bg: '#0a0a0a', card: '#18181b', border: '#27272a', accent: '#f59e0b', text: '#f4f4f5', muted: '#a1a1aa' },
  midnight: { label: 'Indigo Night',   bg: '#0b1120', card: '#111c34', border: '#1e293b', accent: '#6366f1', text: '#e2e8f0', muted: '#94a3b8' },
  rose:     { label: 'Rose',           bg: '#1a0a12', card: '#2a1020', border: '#3f1d2e', accent: '#fb7185', text: '#fce7f3', muted: '#d8a7b8' },
  gold:     { label: 'Royal Gold',     bg: '#14110a', card: '#26200f', border: '#3a3115', accent: '#eab308', text: '#fef9c3', muted: '#cabf86' },
  ocean:    { label: 'Ocean',          bg: '#021a1a', card: '#04282a', border: '#0a3d40', accent: '#22d3ee', text: '#cffafe', muted: '#7bbfc7' },
  light:    { label: 'Daylight',       bg: '#f5f5f4', card: '#ffffff', border: '#e7e5e4', accent: '#e11d48', text: '#1c1917', muted: '#78716c' },
}
export type ThemeName = keyof typeof THEMES

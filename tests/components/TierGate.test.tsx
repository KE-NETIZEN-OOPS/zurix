import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TierGate from '@/components/ui/TierGate'

describe('TierGate', () => {
  it('shows children when user has access', () => {
    render(<TierGate required="flame" userTier="flame"><div>Protected content</div></TierGate>)
    expect(screen.getByText('Protected content')).toBeTruthy()
  })
  it('shows upgrade prompt when user lacks access', () => {
    render(<TierGate required="blaze" userTier="free"><div>Protected content</div></TierGate>)
    expect(screen.queryByText('Protected content')).toBeNull()
    expect(screen.getByText(/Upgrade/i)).toBeTruthy()
  })
  it('inferno user sees blaze content', () => {
    render(<TierGate required="blaze" userTier="inferno"><div>Blaze content</div></TierGate>)
    expect(screen.getByText('Blaze content')).toBeTruthy()
  })
})

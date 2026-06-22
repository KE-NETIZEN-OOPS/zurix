import { createHmac, timingSafeEqual } from 'crypto'

const PERSONA_API = 'https://withpersona.com/api/v1'

export function personaConfigured(): boolean {
  return !!process.env.PERSONA_API_KEY
}

// Fetch an inquiry's status from Persona to confirm approval server-side.
export async function getInquiry(inquiryId: string): Promise<{ status: string; referenceId: string | null } | null> {
  if (!process.env.PERSONA_API_KEY) return null
  const res = await fetch(`${PERSONA_API}/inquiries/${inquiryId}`, {
    headers: {
      Authorization: `Bearer ${process.env.PERSONA_API_KEY}`,
      'Persona-Version': '2023-01-05',
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const json = await res.json()
  const attr = json?.data?.attributes ?? {}
  return { status: attr.status ?? '', referenceId: attr['reference-id'] ?? null }
}

// Verify a Persona webhook signature: header `t=<ts>,v1=<hmac>` over `${t}.${body}`.
export function verifyWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PERSONA_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false
  const parts = Object.fromEntries(signatureHeader.split(',').map(p => p.trim().split('=')))
  const t = parts['t']; const v1 = parts['v1']
  if (!t || !v1) return false
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(v1)) } catch { return false }
}

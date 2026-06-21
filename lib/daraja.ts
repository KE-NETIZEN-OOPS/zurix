const DARAJA_BASE = process.env.DARAJA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

async function getToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
}

function normalizePhone(phone: string): string {
  if (phone.startsWith('0')) return `254${phone.slice(1)}`
  if (phone.startsWith('+')) return phone.slice(1)
  return phone
}

export async function stkPush(phone: string, amountKes: number, reference: string) {
  const token = await getToken()
  const timestamp = getTimestamp()
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64')

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amountKes,
      PartyA: normalizePhone(phone),
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: normalizePhone(phone),
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: reference,
      TransactionDesc: 'ZuriX Subscription',
    }),
  })
  return res.json() as Promise<{ CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string }>
}

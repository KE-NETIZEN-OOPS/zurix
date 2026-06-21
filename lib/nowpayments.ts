import { createHmac } from 'crypto'

const NP_BASE = 'https://api.nowpayments.io/v1'

export async function createInvoice(params: {
  amountKes: number
  orderId: string
  description: string
  successUrl: string
  cancelUrl: string
}): Promise<{ invoice_url: string; id: string }> {
  const res = await fetch(`${NP_BASE}/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: params.amountKes,
      price_currency: 'kes',
      pay_currency: 'usdttrc20',
      order_id: params.orderId,
      order_description: params.description,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      is_fixed_rate: false,
      is_fee_paid_by_user: false,
    }),
  })
  return res.json()
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
    .update(payload)
    .digest('hex')
  return expected === signature
}

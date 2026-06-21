const PESAPAL_BASE = process.env.PESAPAL_ENV === 'production'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3'

async function getToken(): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  })
  const data = await res.json() as { token: string }
  return data.token
}

export async function submitOrder(params: {
  amount: number
  currency: string
  orderId: string
  description: string
  callbackUrl: string
  notificationId: string
  email: string
}): Promise<{ redirect_url: string; order_tracking_id: string }> {
  const token = await getToken()
  const res = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      id: params.orderId,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: params.callbackUrl,
      notification_id: params.notificationId,
      billing_address: { email_address: params.email },
    }),
  })
  return res.json()
}

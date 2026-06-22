'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

const TEMPLATE = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID
const ENV_ID = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID

declare global { interface Window { Persona?: any } }

export default function VerifyButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function loadSdk(): Promise<void> {
    return new Promise(res => {
      if (window.Persona) return res()
      const s = document.createElement('script')
      s.src = 'https://cdn.withpersona.com/dist/persona-v5.1.2.js'
      s.onload = () => res()
      document.head.appendChild(s)
    })
  }

  async function verify() {
    setBusy(true); setMsg('')
    await loadSdk()
    if (!window.Persona) { setMsg('Could not load verification.'); setBusy(false); return }
    const client = new window.Persona.Client({
      templateId: TEMPLATE,
      ...(ENV_ID ? { environmentId: ENV_ID } : { environment: 'sandbox' }),
      referenceId: userId,
      onReady: () => client.open(),
      onComplete: async ({ inquiryId }: { inquiryId: string }) => {
        const r = await fetch('/api/verify/persona/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inquiryId }) }).then(res => res.json())
        setMsg(r.verified ? 'Verified ✓' : 'Submitted — pending review.')
        if (r.verified) router.refresh()
        setBusy(false)
      },
      onCancel: () => setBusy(false),
      onError: () => { setMsg('Verification error.'); setBusy(false) },
    })
  }

  // Persona not configured yet -> fall back to photo-based verification.
  if (!TEMPLATE) {
    return (
      <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/40 rounded-xl p-3 text-sm">
        ⚠ Add a profile photo in <Link href="/settings" className="text-[var(--accent)] underline">Settings</Link> to get your verified tick and unlock messaging.
      </div>
    )
  }
  return (
    <div>
      <button onClick={verify} disabled={busy} className="w-full bg-[var(--accent)] text-black font-bold py-2 rounded-full disabled:opacity-50">
        {busy ? 'Verifying…' : '✓ Verify your identity (selfie + ID)'}
      </button>
      {msg && <p className="text-xs text-center mt-1 text-[var(--muted)]">{msg}</p>}
    </div>
  )
}

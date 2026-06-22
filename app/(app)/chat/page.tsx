'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import TierGate from '@/components/ui/TierGate'
import { createClient } from '@/lib/supabase/client'

interface Message { id: string; content: string; sender_id: string; receiver_id: string; created_at: string }
interface Thread { id: string; sender_id: string; receiver_id: string; content: string; users: { username: string; display_name: string; avatar_url: string } }
interface OtherUser { id: string; username: string; display_name: string; avatar_url: string }
interface PhoneReq { id: string; status: string; users: { id: string; username: string; display_name: string; avatar_url: string } }

function ChatInner() {
  const searchParams = useSearchParams()
  const [tier, setTier] = useState('free')
  const [verified, setVerified] = useState(false)
  const [quota, setQuota] = useState<any>(null)
  const [myId, setMyId] = useState('')
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [other, setOther] = useState<OtherUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [phone, setPhone] = useState<{ outgoing: string | null; theirPhone: string | null } | null>(null)
  const [requests, setRequests] = useState<PhoneReq[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  function refreshQuota() { fetch('/api/messages?quota=1').then(r => r.json()).then(q => { setQuota(q); setTier(q.tier); setVerified(q.verified) }) }
  function refreshRequests() { fetch('/api/phone-request').then(r => r.json()).then(d => setRequests((d.requests ?? []).filter((r: PhoneReq) => r.status === 'pending'))) }

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setMyId(d.id ?? ''))
    fetch('/api/messages').then(r => r.json()).then(d => setThreads(d.threads ?? []))
    refreshQuota(); refreshRequests()
    const initial = searchParams.get('with')
    if (initial) setActiveId(initial)
  }, [])

  useEffect(() => {
    if (!activeId) return
    fetch(`/api/messages?with=${activeId}`).then(r => r.json()).then(d => { setMessages(d.messages ?? []); setOther(d.other ?? null) })
    fetch(`/api/phone-request?with=${activeId}`).then(r => r.json()).then(setPhone)
    const supabase = createClient()
    const channel = supabase.channel('messages-' + activeId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new as Message
      if (m.sender_id === activeId || m.receiver_id === activeId) setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeId) return
    const content = input
    setInput(''); setError('')
    const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: activeId, content }) })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Could not send'); setInput(content); return }
    const d = await res.json()
    setMessages(prev => prev.some(x => x.id === d.message.id) ? prev : [...prev, d.message])
    refreshQuota()
  }

  async function requestPhone() {
    if (!activeId) return
    const res = await fetch('/api/phone-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: activeId }) })
    const d = await res.json()
    if (!res.ok) { setError(d.error ?? 'Could not request'); return }
    setPhone(p => ({ outgoing: 'pending', theirPhone: p?.theirPhone ?? null }))
  }

  async function respond(id: string, action: 'accept' | 'decline') {
    await fetch('/api/phone-request', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: id, action }) })
    refreshRequests()
  }

  return (
    <TierGate required="flame" userTier={tier as any}>
      {!verified ? (
        <div className="text-center py-20">
          <p className="text-[var(--muted)] mb-4">Add a profile photo to get verified and unlock messaging.</p>
          <Link href="/settings" className="bg-[var(--accent)] text-black font-bold px-6 py-2 rounded-full">Go to Settings</Link>
        </div>
      ) : (
      <div>
        {quota && (
          <div className="mb-3 text-xs text-[var(--muted)] flex flex-wrap gap-3">
            <span>💬 {quota.messagesToday}{quota.limits.messagesPerDay ? `/${quota.limits.messagesPerDay}` : ''} messages today</span>
            <span>✨ {quota.newChatsToday}{quota.limits.newChatsPerDay ? `/${quota.limits.newChatsPerDay}` : ''} new chats today</span>
            {!quota.limits.messagesPerDay && <span className="text-[var(--accent)]">Unlimited (Inferno)</span>}
          </div>
        )}

        {requests.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--accent)]/40 rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold mb-2">📞 Phone number requests</p>
            {requests.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-1">
                <Link href={`/profile/${r.users.username}`} className="text-sm flex-1">{r.users.display_name} wants your number</Link>
                <button onClick={() => respond(r.id, 'accept')} className="text-xs bg-green-600 text-white px-3 py-1 rounded-full">Accept</button>
                <button onClick={() => respond(r.id, 'decline')} className="text-xs border border-[var(--border)] px-3 py-1 rounded-full">Decline</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex h-[calc(100vh-13rem)] rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className={`${activeId ? 'hidden sm:flex' : 'flex'} w-full sm:w-72 flex-shrink-0 bg-[var(--card)] border-r border-[var(--border)] flex-col`}>
            <div className="p-4 border-b border-[var(--border)] font-bold">Messages</div>
            <div className="flex-1 overflow-y-auto">
              {threads.map(t => {
                const otherUid = t.sender_id === myId ? t.receiver_id : t.sender_id
                const u = t.users
                return (
                  <button key={t.id} onClick={() => setActiveId(otherUid)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/20 transition ${activeId === otherUid ? 'bg-black/20' : ''}`}>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-700">
                      {u?.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{u?.display_name}</p>
                      <p className="text-[var(--muted)] text-xs truncate">{t.content}</p>
                    </div>
                  </button>
                )
              })}
              {threads.length === 0 && <p className="text-[var(--muted)] text-sm text-center p-6">No conversations yet. Visit a profile and tap Message.</p>}
            </div>
          </div>

          <div className={`${activeId ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-[var(--bg)]`}>
            {activeId ? (
              <>
                <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
                  <button onClick={() => setActiveId(null)} className="sm:hidden text-[var(--muted)]">←</button>
                  {other && (
                    <Link href={`/profile/${other.username}`} className="flex items-center gap-2">
                      <span className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 block">
                        {other.avatar_url && <Image src={other.avatar_url} alt="" fill className="object-cover" unoptimized />}
                      </span>
                      <span className="text-sm font-semibold">{other.display_name}</span>
                    </Link>
                  )}
                  <div className="ml-auto">
                    {phone?.theirPhone ? (
                      <a href={`https://wa.me/${phone.theirPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full">💬 {phone.theirPhone}</a>
                    ) : phone?.outgoing === 'pending' ? (
                      <span className="text-xs text-[var(--muted)]">📞 requested…</span>
                    ) : (
                      <button onClick={requestPhone} className="text-xs border border-[var(--accent)] text-[var(--accent)] px-3 py-1.5 rounded-full">📞 Request #</button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {messages.map(m => (
                    <div key={m.id} className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.sender_id === myId ? 'bg-[var(--accent)] text-black self-end rounded-br-none' : 'bg-[var(--card)] self-start rounded-bl-none'}`}>{m.content}</div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                {error && <p className="text-red-400 text-xs px-4 pb-1">{error}</p>}
                <form onSubmit={sendMessage} className="p-3 border-t border-[var(--border)] flex gap-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…" className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
                  <button type="submit" className="bg-[var(--accent)] text-black font-bold px-4 py-2 rounded-full text-sm">Send</button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--muted)]">Select a conversation</div>
            )}
          </div>
        </div>
      </div>
      )}
    </TierGate>
  )
}

export default function ChatPage() {
  return <Suspense fallback={<div className="text-center py-20 text-[var(--muted)]">Loading…</div>}><ChatInner /></Suspense>
}

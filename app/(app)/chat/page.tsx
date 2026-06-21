'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import TierGate from '@/components/ui/TierGate'
import { createClient } from '@/lib/supabase/client'

interface Message { id: string; content: string; sender_id: string; receiver_id: string; created_at: string }
interface Thread { id: string; sender_id: string; receiver_id: string; content: string; users: { username: string; display_name: string; avatar_url: string } }

export default function ChatPage() {
  const [tier, setTier] = useState('free')
  const [myId, setMyId] = useState('')
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => { setTier(d.tier ?? 'free'); setMyId(d.id ?? '') })
    fetch('/api/messages').then(r => r.json()).then(d => setThreads(d.threads ?? []))
  }, [])

  useEffect(() => {
    if (!activeId) return
    fetch(`/api/messages?with=${activeId}`).then(r => r.json()).then(d => setMessages(d.messages ?? []))
    const supabase = createClient()
    const channel = supabase.channel('messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new as Message
      if (m.sender_id === activeId || m.receiver_id === activeId) setMessages(prev => [...prev, m])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault(); if (!input.trim() || !activeId) return
    const content = input; setInput('')
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: activeId, content }) })
  }

  return (
    <TierGate required="flame" userTier={tier as any}>
      <div className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-zinc-800">
        <div className="w-72 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800 font-bold">Messages</div>
          <div className="flex-1 overflow-y-auto">
            {threads.map(t => {
              const other = t.sender_id === myId ? t.receiver_id : t.sender_id
              const u = t.users
              return (
                <button key={t.id} onClick={() => setActiveId(other)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition ${activeId === other ? 'bg-zinc-800' : ''}`}>
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {u?.avatar_url && <Image src={u.avatar_url} alt="" fill className="object-cover" unoptimized />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{u?.display_name}</p>
                    <p className="text-zinc-500 text-xs truncate">{t.content}</p>
                  </div>
                </button>
              )
            })}
            {threads.length === 0 && <p className="text-zinc-600 text-sm text-center p-6">No conversations yet</p>}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-zinc-950">
          {activeId ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messages.map(m => (
                  <div key={m.id} className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.sender_id === myId ? 'bg-amber-500 text-black self-end rounded-br-none' : 'bg-zinc-800 text-white self-start rounded-bl-none'}`}>{m.content}</div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-zinc-800 flex gap-3">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                <button type="submit" className="bg-amber-500 text-black font-bold px-4 py-2 rounded-full hover:bg-amber-400 transition text-sm">Send</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600">Select a conversation</div>
          )}
        </div>
      </div>
    </TierGate>
  )
}

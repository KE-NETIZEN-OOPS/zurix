'use client'
import Image from 'next/image'
import Link from 'next/link'

interface Profile {
  id: string; username: string; display_name: string
  age: number; location_city: string; avatar_url: string; is_verified: boolean
  distanceMiles?: number | null
}

export default function ProfileCard({ profile, onInterested }: { profile: Profile; onInterested?: (id: string) => void }) {
  return (
    <div className="relative rounded-xl overflow-hidden aspect-[3/4] group cursor-pointer">
      <Link href={`/profile/${profile.username}`}>
        <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {profile.distanceMiles != null && (
          <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">📍 {profile.distanceMiles} mi</span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm">{profile.display_name}</span>
            {profile.is_verified && <span className="text-amber-500 text-xs">✓</span>}
          </div>
          <p className="text-zinc-300 text-xs">{profile.age} · {profile.location_city}</p>
        </div>
      </Link>
      <button onClick={() => onInterested?.(profile.id)}
        className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition text-sm"
        title="Interested">❤️</button>
    </div>
  )
}

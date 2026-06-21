import ExploreGrid from '@/components/explore/ExploreGrid'

export default function ExplorePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-zinc-400 text-sm hidden sm:block">Tap a profile to connect</p>
      </div>
      <ExploreGrid />
    </div>
  )
}

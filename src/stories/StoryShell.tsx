import { Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { stories } from './registry'

export default function StoryShell() {
  const { slug } = useParams<{ slug: string }>()
  const story = stories.find((s) => s.slug === slug)

  if (!story) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex flex-col items-center justify-center font-mono">
        <p className="text-lg mb-4">Story not found.</p>
        <Link to="/" className="text-neutral-500 hover:text-neutral-300 underline underline-offset-4">
          Back to gallery
        </Link>
      </div>
    )
  }

  const StoryComponent = story.component

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="shrink-0 px-4 py-3 bg-neutral-950 border-b border-neutral-800/50">
        <Link
          to="/"
          className="inline-block px-3 py-1.5 text-xs font-mono rounded bg-black/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 transition-colors"
        >
          &larr; Gallery
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="text-neutral-500 font-mono text-sm animate-pulse">Loading...</div>
          </div>
        }
      >
        <StoryComponent />
      </Suspense>
    </div>
  )
}

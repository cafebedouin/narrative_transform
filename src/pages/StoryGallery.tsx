import { Link } from 'react-router-dom'
import { stories } from '../stories/registry'

export default function StoryGallery() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 flex flex-col items-center justify-center px-6 py-16">
      <header className="text-center mb-16">
        <h1 className="text-3xl font-light tracking-widest text-neutral-200 mb-3">
          Narrative Transform
        </h1>
        <p className="text-sm text-neutral-500 font-mono tracking-wide">
          Interactive stories
        </p>
      </header>

      <div className="grid gap-6 w-full max-w-2xl">
        {stories.map((story) => (
          <Link
            key={story.slug}
            to={`/${story.slug}`}
            className="group block p-6 rounded border border-neutral-800 hover:border-neutral-600 bg-neutral-900/50 hover:bg-neutral-900 transition-all duration-300"
          >
            <h2 className="text-xl font-light text-neutral-200 group-hover:text-white mb-2 transition-colors">
              {story.title}
            </h2>
            <p className="text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors leading-relaxed">
              {story.tagline}
            </p>
          </Link>
        ))}
      </div>

      <footer className="mt-20 text-center text-xs text-neutral-700 font-mono">
        cafebedouin
      </footer>
    </div>
  )
}

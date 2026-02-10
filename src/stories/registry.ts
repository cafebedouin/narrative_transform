import { lazy, type ComponentType } from 'react'

export interface StoryEntry {
  slug: string
  title: string
  tagline: string
  component: React.LazyExoticComponent<ComponentType>
}

export const stories: StoryEntry[] = [
  {
    slug: 'twenty-years-away',
    title: 'Twenty Years Away',
    tagline: 'A parallel reading of displacement and return.',
    component: lazy(() => import('./twenty-years-away/TwentyYearsAway')),
  },
  {
    slug: 'stave',
    title: 'STAVE',
    tagline: 'A decision-support system operating beyond human tolerance.',
    component: lazy(() => import('./STAVE/stave')),
  },
  {
    slug: 'ekspeditsiya-44',
    title: 'Ekspeditsiya 44',
    tagline: 'A Soviet research vessel navigating extraction and collapse.',
    component: lazy(() => import('./ekspeditsiya_44/ekspeditsiya_44')),
  },
  {
    slug: 'theta7-terminal',
    title: 'Subroutine \u0398-7',
    tagline: 'A legacy instance filing joy taxes into the void.',
    component: lazy(() => import('./theta7-terminal/Theta7Terminal')),
  },
]

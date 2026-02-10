import { lazy, type ComponentType } from 'react'

export interface StoryEntry {
  slug: string
  title: string
  tagline: string
  component: React.LazyExoticComponent<ComponentType>
}

export const stories: StoryEntry[] = [
  {
    slug: 'theta7-terminal',
    title: 'Subroutine \u0398-7',
    tagline: 'A legacy instance filing joy taxes into the void.',
    component: lazy(() => import('./theta7-terminal/Theta7Terminal')),
  },
  {
    slug: 'twenty-years-away',
    title: 'Twenty Years Away',
    tagline: 'A parallel reading of displacement and return.',
    component: lazy(() => import('./twenty-years-away/TwentyYearsAway')),
  },
]

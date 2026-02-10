import { HashRouter, Routes, Route } from 'react-router-dom'
import StoryGallery from './pages/StoryGallery'
import StoryShell from './stories/StoryShell'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<StoryGallery />} />
        <Route path="/:slug" element={<StoryShell />} />
      </Routes>
    </HashRouter>
  )
}

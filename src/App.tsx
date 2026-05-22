import { useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import BookList from './pages/BookList'
import ChapterList from './pages/ChapterList'
import Reader from './pages/Reader'
import Search from './pages/Search'
import Profile from './pages/Profile'
import { useSettings } from './store/settings'
import { IconBook, IconSearch, IconUser } from './components/Icons'
import './styles/app.css'

const THEME_COLORS: Record<string, string> = {
  light: '#faf8f5',
  dark: '#1a1a1a',
  sepia: '#f5f0e8',
}

function ThemeSync() {
  const theme = useSettings((s) => s.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLORS[theme] || '#faf8f5')
  }, [theme])
  return null
}

function TabBar() {
  const location = useLocation()
  if (location.pathname.startsWith('/reader')) return null

  return (
    <nav className="tab-bar">
      <NavLink to="/" end className="tab-item">
        <IconBook size={22} />
        <span className="tab-label">书报</span>
      </NavLink>
      <NavLink to="/search" className="tab-item">
        <IconSearch size={22} />
        <span className="tab-label">搜索</span>
      </NavLink>
      <NavLink to="/profile" className="tab-item">
        <IconUser size={22} />
        <span className="tab-label">我的</span>
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryId" element={<BookList />} />
        <Route path="/book/:categoryId/:bookId" element={<ChapterList />} />
        <Route path="/reader/:categoryId/:bookId/:chapterIdx" element={<Reader />} />
        <Route path="/search" element={<Search />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <TabBar />
    </HashRouter>
  )
}

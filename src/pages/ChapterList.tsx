import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchIndex, CategoryMeta, BookMeta } from '../hooks/useBook'
import { useSettings } from '../store/settings'
import { IconArrowLeft } from '../components/Icons'

export default function ChapterList() {
  const { categoryId, bookId } = useParams<{ categoryId: string; bookId: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<CategoryMeta | null>(null)
  const [book, setBook] = useState<BookMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const savedProgress = useSettings((s) => bookId ? s.getProgress(bookId) : null)

  useEffect(() => {
    const cid = parseInt(categoryId || '1', 10)
    fetchIndex()
      .then((index) => {
        const c = index.categories.find((x) => x.id === cid)
        if (c) {
          setCategory(c)
          const b = c.books.find((x) => x.id === bookId)
          if (b) setBook(b)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [categoryId, bookId])

  if (loading) return <div className="loading">加载中...</div>
  if (!book || !category) {
    return (
      <div className="empty-state">
        <p>未找到该书</p>
        <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>返回</button>
      </div>
    )
  }

  const cid = parseInt(categoryId || '1', 10)

  return (
    <div className="app-shell">
      <div className="app-header">
        <button className="btn-back" onClick={() => navigate(`/category/${cid}`)} aria-label="返回">
          <IconArrowLeft size={18} />
        </button>
        <h1>{book.title}</h1>
      </div>
      <div className="app-content">
        <div className="list-container" style={{ padding: 0 }}>
          <div className="section-title" style={{ padding: '0 16px', marginTop: 12 }}>
            {book.chapterCount} 章
          </div>
          {book.chapters.map((ch, ci) => (
            <Link
              key={ci}
              to={`/reader/${cid}/${book.id}/${ci}`}
              className="chapter-item"
            >
              <span className="chapter-num">
                {savedProgress?.chapterIdx === ci && (
                  <span style={{ color: 'var(--accent)' }}>●</span>
                )}
                {savedProgress?.chapterIdx !== ci && ci + 1}
              </span>
              <span className="chapter-title">{ch.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchIndex, IndexData, CategoryMeta } from '../hooks/useBook'
import { useSettings } from '../store/settings'

export default function Home() {
  const [index, setIndex] = useState<IndexData | null>(null)
  const [loading, setLoading] = useState(true)
  const lastRead = useSettings((s) => s.lastRead)

  useEffect(() => {
    fetchIndex()
      .then(setIndex)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">加载中...</div>

  if (!index) {
    return (
      <div className="empty-state">
        <div className="icon">[ ]</div>
        <p>无法加载数据，请检查网络</p>
      </div>
    )
  }

  let continueInfo: { category: CategoryMeta; bookId: string; chapterIdx: number; chapterTitle: string } | null = null
  if (lastRead) {
    for (const cat of index.categories) {
      if (cat.id !== lastRead.categoryId) continue
      const book = cat.books.find((b) => b.id === lastRead.bookId)
      if (book) {
        const ch = book.chapters[lastRead.chapterIdx]
        if (ch) {
          continueInfo = { category: cat, bookId: lastRead.bookId, chapterIdx: lastRead.chapterIdx, chapterTitle: ch.title }
        }
      }
      break
    }
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>爱灵慕圣书报</h1>
      </div>
      <div className="app-content">
        <div className="list-container">
          {continueInfo && (
            <Link
              to={`/reader/${continueInfo.category.id}/${continueInfo.bookId}/${continueInfo.chapterIdx}`}
              className="continue-card"
            >
              <div className="continue-body">
                <div className="continue-label">继续阅读</div>
                <div className="continue-book">
                  {continueInfo.category.name} · {continueInfo.category.books.find((b) => b.id === continueInfo.bookId)?.title}
                </div>
                <div className="continue-chapter">{continueInfo.chapterTitle}</div>
              </div>
            </Link>
          )}

          <div className="section-title">书报分类</div>
          {index.categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              className="category-hero"
            >
              <div className="category-hero-title">{cat.name}</div>
              <div className="category-hero-count">
                {cat.books.length} 册 · {cat.books.reduce((s, b) => s + b.chapterCount, 0)} 章
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

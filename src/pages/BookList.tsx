import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchIndex, CategoryMeta, BookMeta } from '../hooks/useBook'
import { IconArrowLeft } from '../components/Icons'

export default function BookList() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<CategoryMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const cid = parseInt(categoryId || '1', 10)
    fetchIndex()
      .then((index) => {
        const c = index.categories.find((x) => x.id === cid)
        if (c) setCategory(c)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [categoryId])

  if (loading) return <div className="loading">加载中...</div>
  if (!category) {
    return (
      <div className="empty-state">
        <p>未找到该分类</p>
        <button className="btn-back" onClick={() => navigate('/')} style={{ marginTop: 16 }}>返回</button>
      </div>
    )
  }

  const filteredBooks = filter.trim()
    ? category.books.filter((b) => b.title.includes(filter.trim()))
    : category.books

  return (
    <div className="app-shell">
      <div className="app-header">
        <button className="btn-back" onClick={() => navigate('/')} aria-label="返回">
          <IconArrowLeft size={18} />
        </button>
        <h1>{category.name}</h1>
      </div>
      <div className="booklist-search">
        <input
          className="booklist-search-input"
          type="text"
          placeholder={`搜索${category.name}书报...`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="app-content">
        <div className="list-container">
          <div className="section-title">
            {filter ? `找到 ${filteredBooks.length} 册` : `${category.books.length} 册`}
          </div>
          {filteredBooks.map((book) => (
            <Link
              key={book.id}
              to={`/book/${category.id}/${book.id}`}
              className="card"
            >
              <div className="card-title">{book.title}</div>
              <div className="card-meta">{book.chapterCount} 章</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

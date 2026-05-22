import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fetchIndex, fetchBook, IndexData } from '../hooks/useBook'
import { IconFolder, IconSearch, IconX, IconArrowLeft, IconArrowRight, IconArrowUp, IconArrowDown } from '../components/Icons'
import { App } from '@capacitor/app'

interface SearchEntry {
  cid: number; cn: string; b: string; bt: string; ci: number; ct: string; t: string
}

type Level = 'L1' | 'L2' | 'L3'

interface L2State { categoryId: number; categoryName: string; bookId: string; bookTitle: string }
interface L3State { categoryId: number; bookId: string; chapterIdx: number; chapterTitle: string }

interface PickerBook { categoryId: number; categoryName: string; bookId: string; title: string; chapterCount: number }

function splitHighlight(text: string, keyword: string): string[] {
  if (!keyword.trim()) return [text]
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi'))
}

function isMatch(part: string, keyword: string): boolean {
  return part.toLowerCase() === keyword.toLowerCase()
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [level, setLevel] = useState<Level>('L1')
  const [l2, setL2] = useState<L2State | null>(null)
  const [l3, setL3] = useState<L3State | null>(null)

  const [l3Paragraphs, setL3Paragraphs] = useState<string[]>([])
  const [l3Loading, setL3Loading] = useState(false)

  const [showPicker, setShowPicker] = useState(false)
  const [pickerBooks, setPickerBooks] = useState<PickerBook[]>([])
  const levelRef = useRef(level)
  levelRef.current = level
  const l2Ref = useRef(l2)
  l2Ref.current = l2

  useEffect(() => { fetchIndex().then(setIndex) }, [])

  const pushedForLevel = useRef(false)
  useEffect(() => {
    if (level !== 'L1' && !pushedForLevel.current) {
      window.history.pushState({ searchLevel: level }, '')
      pushedForLevel.current = true
    }
    if (level === 'L1') pushedForLevel.current = false
  }, [level])

  useEffect(() => {
    const handleBack = () => {
      const cur = levelRef.current
      if (cur === 'L3') {
        if (l2Ref.current) setLevel('L2')
        else setLevel('L1')
      } else if (cur === 'L2') {
        setLevel('L1'); setL2(null)
      }
    }
    window.addEventListener('popstate', handleBack)
    let backListener: any = null
    try {
      backListener = App.addListener('backButton', ({ canGoBack }) => {
        if (levelRef.current !== 'L1') handleBack()
        else if (!canGoBack) App.exitApp()
      })
    } catch {}
    return () => {
      window.removeEventListener('popstate', handleBack)
      if (backListener?.remove) backListener.remove()
    }
  }, [])

  const loadSearchData = useCallback(() => {
    if (!searchData && !searchLoading) {
      setSearchLoading(true)
      fetch('/data/search-index.json')
        .then((r) => r.json())
        .then(setSearchData)
        .catch(console.error)
        .finally(() => setSearchLoading(false))
    }
  }, [searchData, searchLoading])

  const q = query.trim()

  const allResults = useMemo(() => {
    if (!q || !searchData) return []
    const lower = q.toLowerCase()
    const results: SearchEntry[] = []
    for (const e of searchData) {
      if (e.ct.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower)) {
        results.push(e)
        if (results.length >= 200) break
      }
    }
    return results
  }, [q, searchData])

  const grouped = useMemo(() => {
    const map = new Map<string, { categoryId: number; categoryName: string; bookId: string; bookTitle: string; entries: SearchEntry[] }>()
    for (const r of allResults) {
      const key = `${r.cid}-${r.b}`
      if (!map.has(key)) {
        map.set(key, { categoryId: r.cid, categoryName: r.cn, bookId: r.b, bookTitle: r.bt, entries: [] })
      }
      map.get(key)!.entries.push(r)
    }
    return Array.from(map.values())
  }, [allResults])

  const l2Results = useMemo(() => {
    if (!l2 || !searchData) return []
    if (q) {
      const lower = q.toLowerCase()
      return searchData.filter((e) =>
        e.cid === l2.categoryId && e.b === l2.bookId &&
        (e.ct.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower))
      )
    }
    return searchData.filter((e) => e.cid === l2.categoryId && e.b === l2.bookId)
  }, [l2, searchData, q])

  const l2BrowseChapters = useMemo(() => {
    if (q || !l2 || !index) return null
    const cat = index.categories.find((c) => c.id === l2.categoryId)
    if (!cat) return null
    const book = cat.books.find((b) => b.id === l2.bookId)
    if (!book) return null
    return book.chapters
  }, [q, l2, index])

  const goL2 = (categoryId: number, categoryName: string, bookId: string, bookTitle: string) => {
    setL2({ categoryId, categoryName, bookId, bookTitle })
    setLevel('L2')
  }

  const goL3ReqId = useRef(0)

  const goL3 = async (categoryId: number, bookId: string, chapterIdx: number, chapterTitle: string) => {
    const reqId = ++goL3ReqId.current
    setL3({ categoryId, bookId, chapterIdx, chapterTitle })
    setL3Loading(true)
    setL3Paragraphs([])
    setLevel('L3')
    try {
      const book = await fetchBook(bookId)
      if (reqId !== goL3ReqId.current) return
      const ch = book.chapters[chapterIdx]
      setL3Paragraphs(ch?.paragraphs || [])
      setL3Loading(false)
    } catch {
      if (reqId === goL3ReqId.current) {
        setL3Paragraphs([])
        setL3Loading(false)
      }
    }
  }

  const goBack = () => {
    if (level === 'L3') {
      if (l2) setLevel('L2')
      else setLevel('L1')
    } else if (level === 'L2') {
      setLevel('L1'); setL2(null)
    }
  }

  const openPicker = () => {
    if (!index) return
    const books: PickerBook[] = []
    for (const cat of index.categories) {
      cat.books.forEach((b) => {
        books.push({ categoryId: cat.id, categoryName: cat.name, bookId: b.id, title: b.title, chapterCount: b.chapterCount })
      })
    }
    setPickerBooks(books)
    setShowPicker(true)
  }

  const pickerSelectBook = (book: PickerBook) => {
    goL2(book.categoryId, book.categoryName, book.bookId, book.title)
    setShowPicker(false)
  }

  return (
    <div className="app-shell">
      {level === 'L1' && (
        <div className="app-header search-header">
          <button className="picker-btn" onClick={openPicker}><IconFolder size={18} /></button>
          <div className="search-input-wrap">
            <span className="search-icon"><IconSearch size={16} /></span>
            <input
              className="search-input"
              type="text"
              placeholder="搜索书报..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={loadSearchData}
              autoFocus
            />
            {query && <button className="search-clear" onClick={() => setQuery('')}><IconX size={14} /></button>}
          </div>
        </div>
      )}

      {(level === 'L2' || level === 'L3') && (
        <div className="app-header">
          <button className="btn-back" onClick={goBack}><IconArrowLeft size={18} /></button>
          <h1>{level === 'L3' ? l3?.chapterTitle : l2?.bookTitle}</h1>
        </div>
      )}

      <div className="app-content">
        {level === 'L1' && (
          <>
            {searchLoading && <div className="loading">加载搜索数据...</div>}
            {!searchData && !searchLoading && (
              <div className="empty-state">
                <div className="icon"><IconSearch size={36} /></div>
                <p>输入关键词搜索章节标题和内容</p>
              </div>
            )}
            {searchData && q && allResults.length === 0 && !searchLoading && (
              <div className="empty-state">
                <div className="icon">?</div>
                <p>未找到「{q}」</p>
              </div>
            )}
            {allResults.length > 0 && (
              <div className="search-results">
                <div className="search-result-count">找到 {allResults.length} 条</div>
                {grouped.map((g) => (
                  <div key={`${g.categoryId}-${g.bookId}`} className="search-group">
                    <div className="search-group-header">
                      <span className="search-category">{g.categoryName}</span>
                      <span className="search-book-arrow">›</span>
                      <span className="search-book">{g.bookTitle}</span>
                      <span className="search-book-count">({g.entries.length}条)</span>
                    </div>
                    {g.entries.slice(0, 5).map((e, i) => (
                      <button
                        key={i}
                        className="search-result-item"
                        onClick={() => goL3(e.cid, e.b, e.ci, e.ct)}
                      >
                        <div className="search-chapter-title">
                          {splitHighlight(e.ct, q).map((p, j) =>
                            isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p
                          )}
                        </div>
                        {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
                      </button>
                    ))}
                    {g.entries.length > 5 && (
                      <button className="search-more-btn" onClick={() => goL2(g.categoryId, g.categoryName, g.bookId, g.bookTitle)}>
                        查看全部 {g.entries.length} 条 <IconArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {level === 'L2' && l2 && (
          <div className="search-results">
            {q && (
              <>
                <div className="search-result-count">{l2Results.length} 条匹配</div>
                {l2Results.map((e, i) => (
                  <button key={i} className="search-result-item" onClick={() => goL3(e.cid, e.b, e.ci, e.ct)}>
                    <div className="search-chapter-title">
                      {splitHighlight(e.ct, q).map((p, j) =>
                        isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p
                      )}
                    </div>
                    {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
                  </button>
                ))}
              </>
            )}
            {!q && l2BrowseChapters && (
              <>
                <div className="search-result-count">{l2BrowseChapters.length} 章</div>
                {l2BrowseChapters.map((ch) => (
                  <button key={ch.index} className="search-result-item" onClick={() => goL3(l2.categoryId, l2.bookId, ch.index, ch.title)}>
                    <div className="search-chapter-title">{ch.title}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {level === 'L3' && l3 && (
          <TextLocator paragraphs={l3Paragraphs} keyword={q} loading={l3Loading} />
        )}
      </div>

      {showPicker && index && (
        <PickerPanel
          pickerBooks={pickerBooks}
          onClose={() => setShowPicker(false)}
          onSelectBook={pickerSelectBook}
        />
      )}
    </div>
  )
}

function Snippet({ text, keyword }: { text: string; keyword: string }) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - 25)
  const end = Math.min(text.length, idx + keyword.length + 60)
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  return (
    <div className="search-snippet">
      {splitHighlight(snippet, keyword).map((p, i) =>
        isMatch(p, keyword) ? <mark key={i} className="search-highlight">{p}</mark> : p
      )}
    </div>
  )
}

function TextLocator({ paragraphs, keyword, loading }: { paragraphs: string[]; keyword: string; loading: boolean }) {
  const markRefs = useRef<(HTMLElement | null)[]>([])
  const currentRef = useRef(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const renderId = useRef(0)

  const { matchCount } = useMemo(() => {
    if (!paragraphs.length || !keyword.trim()) return { matchCount: 0 }
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    let count = 0
    for (const line of paragraphs) {
      const m = line.match(regex)
      if (m) count += m.length
    }
    return { matchCount: count }
  }, [paragraphs, keyword])

  useEffect(() => {
    renderId.current++
    currentRef.current = 0
    setCurrentMatch(0)
  }, [paragraphs, keyword])

  useEffect(() => {
    if (matchCount === 0) return
    const id = renderId.current
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (id !== renderId.current) return
        const el = markRefs.current[0]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          flash(el)
        }
      })
    })
  }, [paragraphs, keyword, matchCount])

  const scrollToMatch = (index: number) => {
    const el = markRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      flash(el)
      currentRef.current = index
      setCurrentMatch(index)
    }
  }

  const goNext = () => { scrollToMatch((currentRef.current + 1) % matchCount) }
  const goPrev = () => { scrollToMatch((currentRef.current - 1 + matchCount) % matchCount) }

  if (loading) return <div className="loading">加载中...</div>
  if (!paragraphs.length) return <div className="empty-state"><p>暂无内容</p></div>

  return (
    <div className="locator-container">
      {matchCount > 0 && (
        <div className="locator-bar">
          <button className="locator-nav-btn" onClick={goPrev}><IconArrowUp size={14} /></button>
          <span className="locator-counter">{currentMatch + 1} / {matchCount}</span>
          <button className="locator-nav-btn" onClick={goNext}><IconArrowDown size={14} /> 下一处</button>
        </div>
      )}

      <div className="locator-content">
        {matchCount === 0 && !keyword.trim() && paragraphs.map((p, i) => <p key={i} className="locator-p">{p}</p>)}
        {matchCount === 0 && keyword.trim() && <div className="empty-state"><p>本章未找到「{keyword}」</p></div>}
        {matchCount > 0 && (
          <HighlightedText
            key={renderId.current}
            paragraphs={paragraphs}
            keyword={keyword}
            markRefs={markRefs}
          />
        )}
      </div>

      {matchCount > 1 && (
        <div className="locator-fab">
          <button className="locator-fab-btn" onClick={goPrev}><IconArrowUp size={14} /></button>
          <span className="locator-fab-count">{currentMatch + 1}/{matchCount}</span>
          <button className="locator-fab-btn" onClick={goNext}><IconArrowDown size={14} /></button>
        </div>
      )}
    </div>
  )
}

function flash(el: HTMLElement) {
  el.style.background = '#f0a040'
  el.style.transition = 'background 0.3s'
  setTimeout(() => { el.style.background = '' }, 1500)
}

function HighlightedText({ paragraphs, keyword, markRefs }: {
  paragraphs: string[]; keyword: string;
  markRefs: React.MutableRefObject<(HTMLElement | null)[]>
}) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  let matchIdx = 0

  return (
    <>
      {paragraphs.map((p, pi) => {
        const parts = p.split(regex)
        return (
          <p key={pi} className="locator-p">
            {parts.map((part, i) => {
              if (part.toLowerCase() === keyword.toLowerCase()) {
                const idx = matchIdx++
                return (
                  <mark
                    key={i}
                    className="locator-mark"
                    ref={(el) => { markRefs.current[idx] = el }}
                    data-match={idx}
                  >
                    {part}
                  </mark>
                )
              }
              return part
            })}
          </p>
        )
      })}
    </>
  )
}

function PickerPanel({ pickerBooks, onClose, onSelectBook }: {
  pickerBooks: PickerBook[]
  onClose: () => void; onSelectBook: (b: PickerBook) => void
}) {
  let lastCategoryId = -1

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-handle" />
        <div className="picker-header">
          <h2>选择书报</h2>
          <button className="picker-close" onClick={onClose}><IconX size={16} /></button>
        </div>
        <div className="picker-body">
          {pickerBooks.map((b) => {
            const showHeader = b.categoryId !== lastCategoryId
            lastCategoryId = b.categoryId
            return (
              <div key={`${b.categoryId}-${b.bookId}`}>
                {showHeader && (
                  <div className="picker-category-header">{b.categoryName}</div>
                )}
                <button className="picker-book-item" onClick={() => onSelectBook(b)}>
                  <span className="picker-book-title">{b.title}</span>
                  <span className="picker-book-count">{b.chapterCount} 章</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchBook, fetchIndex, findBookMeta, BookData, ChapterData, VerseRef } from '../hooks/useBook'
import { useSettings, getFontSizePx, Theme, FontSize } from '../store/settings'
import { IconArrowLeft, IconArrowRight, IconList, IconX } from '../components/Icons'
import { useReading } from '../store/reading'

export default function Reader() {
  const { categoryId, bookId, chapterIdx } = useParams<{
    categoryId: string
    bookId: string
    chapterIdx: string
  }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromSearch = searchParams.get('from') === 'search'

  const cid = parseInt(categoryId || '1', 10)
  const cidx = parseInt(chapterIdx || '0', 10)

  const theme = useSettings((s) => s.theme)
  const fontSize = useSettings((s) => s.fontSize)
  const setTheme = useSettings((s) => s.setTheme)
  const setFontSize = useSettings((s) => s.setFontSize)
  const saveProgress = useSettings((s) => s.saveProgress)
  const addReadingTime = useReading((s) => s.addReadingTime)
  const markChapterRead = useReading((s) => s.markChapterRead)
  const addToHistory = useReading((s) => s.addToHistory)

  const [bookData, setBookData] = useState<BookData | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const [verseModal, setVerseModal] = useState<{ code: string; text: string } | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const [showScrollbar, setShowScrollbar] = useState(false)
  const scrollbarTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      if (scrollbarTimer.current) clearTimeout(scrollbarTimer.current)
    }
  }, [])

  // Fetch book data
  useEffect(() => {
    if (!bookId) return
    setLoading(true)
    setError(null)
    setBookData(null)

    Promise.all([
      fetchBook(bookId),
      fetchIndex().then((idx) => findBookMeta(idx, bookId)),
    ])
      .then(([data, meta]) => {
        setBookData(data)
        if (meta) {
          setBookTitle(meta.bookMeta.title)
          setCategoryName(meta.category.name)
        } else {
          setError('该书不存在')
        }
      })
      .catch((e) => {
        console.error(e)
        setError('加载失败，请检查网络后重试')
      })
      .finally(() => setLoading(false))
  }, [bookId])

  // Set current chapter
  useEffect(() => {
    if (bookData && cidx >= 0 && cidx < bookData.chapters.length) {
      setChapter(bookData.chapters[cidx])
      if (contentRef.current) contentRef.current.scrollTop = 0
      setScrollPct(0)
    }
  }, [bookData, cidx])

  // Save reading progress
  useEffect(() => {
    if (!chapter || loading || !bookId) return
    const timer = setTimeout(() => {
      saveProgress(cid, bookId, cidx, scrollPct)
    }, 800)
    return () => clearTimeout(timer)
  }, [cid, bookId, cidx, scrollPct, chapter, loading, saveProgress])

  // Mark chapter read + history
  useEffect(() => {
    if (chapter && !loading && bookTitle && !fromSearch && bookId) {
      markChapterRead(bookId, cidx)
      addToHistory({
        categoryId: cid,
        categoryName,
        bookId,
        chapterIdx: cidx,
        chapterTitle: chapter.title,
        bookTitle,
        timestamp: Date.now(),
      })
    }
  }, [bookId, cidx, chapter, loading, fromSearch])

  // Reading timer
  useEffect(() => {
    if (loading || fromSearch) return
    let seconds = 0
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        seconds++
        if (seconds % 30 === 0) addReadingTime(30)
      }
    }, 1000)

    return () => {
      const remaining = seconds % 30
      if (remaining > 0) addReadingTime(remaining)
      clearInterval(interval)
    }
  }, [bookId, cidx, loading, fromSearch, addReadingTime])

  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight) {
      setScrollPct(1)
    } else {
      setScrollPct(Math.min(scrollTop / (scrollHeight - clientHeight), 1))
    }
    if (showControls) setShowControls(false)
    setShowScrollbar(true)
    if (scrollbarTimer.current) clearTimeout(scrollbarTimer.current)
    scrollbarTimer.current = setTimeout(() => setShowScrollbar(false), 1200)
  }, [showControls])

  const handleContentClick = useCallback(() => {
    setShowControls((v) => !v)
  }, [])

  const cycleFontSize = () => {
    const sizes: FontSize[] = ['small', 'medium', 'large', 'xlarge']
    const idx = sizes.indexOf(fontSize)
    setFontSize(sizes[(idx + 1) % sizes.length])
  }

  if (loading) {
    return (
      <div className="reader-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="reader-container">
        <div className="empty-state">
          <div className="icon">!</div>
          <p>{error}</p>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>返回</button>
        </div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="reader-container">
        <div className="empty-state">
          <div className="icon">[ ]</div>
          <p>章节不存在</p>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>返回</button>
        </div>
      </div>
    )
  }

  if (!chapter.paragraphs || chapter.paragraphs.length === 0) {
    return (
      <div className="reader-container">
        <div className="empty-state">
          <div className="icon">[ ]</div>
          <p>本章暂无内容</p>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>返回</button>
        </div>
      </div>
    )
  }

  const hasPrev = cidx > 0
  const hasNext = bookData ? cidx < bookData.chapters.length - 1 : false
  const themeLabel: Record<Theme, string> = { light: '白', dark: '暗', sepia: '护' }
  const fontSizeLabel: Record<FontSize, string> = { small: '小', medium: '中', large: '大', xlarge: '特大' }

  const paragraphs = chapter.paragraphs

  return (
    <div className="reader-container">
      <div
        className={`reader-overlay ${showControls ? 'visible' : ''}`}
        onClick={() => setShowControls(false)}
      >
        <div className="reader-top-bar" onClick={(e) => e.stopPropagation()}>
          <button className="btn-back" onClick={() => navigate(`/book/${cid}/${bookId}`)}>
            <IconArrowLeft size={18} />
          </button>
          <span className="reader-book-title">{bookTitle || chapter.title}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
            {cidx + 1}/{bookData?.chapters.length || 0}
          </span>
        </div>

        <div className="reader-bottom-bar" onClick={(e) => e.stopPropagation()}>
          <div className="theme-group">
            {(['light', 'sepia', 'dark'] as Theme[]).map((t) => (
              <button
                key={t}
                className={`theme-btn ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
              >
                {themeLabel[t]}
              </button>
            ))}
          </div>
          <button className="reader-control-btn" onClick={cycleFontSize}>
            <span className="font-label">{fontSizeLabel[fontSize]}</span>
          </button>
          <Link to={`/book/${cid}/${bookId}`} className="reader-control-btn" style={{ textDecoration: 'none' }}>
            <IconList size={18} />
          </Link>
        </div>
      </div>

      <div className="reader-progress" style={{ width: `${scrollPct * 100}%` }} />

      <div className={`reader-scrollbar ${showScrollbar ? 'visible' : ''}`}>
        <div className="reader-scrollbar-thumb" style={{ height: `${Math.max(scrollPct * 100, 2)}%` }} />
      </div>

      <div
        ref={contentRef}
        className="reader-content"
        onScroll={handleScroll}
        onClick={handleContentClick}
      >
        <div className="reader-text" style={{ fontSize: getFontSizePx(fontSize) }}>
          <h2>{chapter.title}</h2>
          {paragraphs.map((p, i) => (
            <VerseText key={i} text={p} verses={chapter.verses} onVerse={setVerseModal} />
          ))}
        </div>

        <div className="chapter-nav">
          {hasPrev ? (
            <Link to={`/reader/${cid}/${bookId}/${cidx - 1}`} className="chapter-nav-btn">
              <IconArrowLeft size={14} /> 上一章
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link to={`/reader/${cid}/${bookId}/${cidx + 1}`} className="chapter-nav-btn">
              下一章 <IconArrowRight size={14} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>

      {verseModal && (
        <VerseModal
          code={verseModal.code}
          text={verseModal.text}
          onClose={() => setVerseModal(null)}
        />
      )}
    </div>
  )
}

const VERSE_RE = /\[\[r:(\d+)\]\]/g

function VerseText({ text, verses, onVerse }: {
  text: string
  verses?: VerseRef
  onVerse?: (v: { code: string; text: string }) => void
}) {
  if (!verses || !VERSE_RE.test(text)) {
    VERSE_RE.lastIndex = 0
    return <p>{text}</p>
  }
  VERSE_RE.lastIndex = 0
  const parts: (string | { code: string; text: string })[] = []
  let last = 0
  let match
  while ((match = VERSE_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const v = verses[match[1]]
    if (v) parts.push({ code: v.c, text: v.t })
    else parts.push(match[0].replace(/\[\[r:\d+\]\]/, ''))
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))

  return (
    <p>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <span
            key={i}
            className="verse-ref"
            onClick={(e) => {
              e.stopPropagation()
              if (onVerse) onVerse(part)
            }}
          >
            {part.code}
          </span>
        )
      )}
    </p>
  )
}

function VerseModal({ code, text, onClose }: { code: string; text: string; onClose: () => void }) {
  return (
    <div className="verse-overlay" onClick={onClose}>
      <div className="verse-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="verse-header">
          <span className="verse-code">{code}</span>
          <button className="verse-close" onClick={onClose}><IconX size={16} /></button>
        </div>
        <div className="verse-body">{text}</div>
      </div>
    </div>
  )
}

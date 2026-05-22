import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings, Theme, FontSize } from '../store/settings'
import { useReading, HistoryEntry } from '../store/reading'
import { fetchIndex, IndexData } from '../hooks/useBook'

export default function Profile() {
  const navigate = useNavigate()
  const theme = useSettings((s) => s.theme)
  const fontSize = useSettings((s) => s.fontSize)
  const setTheme = useSettings((s) => s.setTheme)
  const setFontSize = useSettings((s) => s.setFontSize)
  const history = useReading((s) => s.history)
  const totalMinutes = useReading((s) => s.totalMinutes)
  const getChapterReadCount = useReading((s) => s.getChapterReadCount)
  const getStreak = useReading((s) => s.getStreak)
  const getTodayMinutes = useReading((s) => s.getTodayMinutes)
  const clearHistory = useReading((s) => s.clearHistory)

  const [index, setIndex] = useState<IndexData | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)

  useEffect(() => {
    fetchIndex().then(setIndex)
  }, [])

  const chapterCount = getChapterReadCount()
  const streak = getStreak()
  const todayMin = Math.round(getTodayMinutes())
  const hours = Math.floor(totalMinutes / 60)
  const mins = Math.round(totalMinutes % 60)

  const themeLabel: Record<Theme, string> = { light: '白', dark: '暗', sepia: '护' }
  const fontSizeLabel: Record<FontSize, string> = { small: '小', medium: '中', large: '大', xlarge: '特大' }

  const historyGrouped = groupByDate(history)
  const displayHistory = showAllHistory ? historyGrouped : historyGrouped.slice(0, 3)

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>我的</h1>
      </div>

      <div className="app-content">
        <div className="profile-container">
          <div className="section-title">阅读统计</div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">
                {hours > 0 ? `${hours}h` : ''}{mins.toFixed(0)}m
              </div>
              <div className="stat-label">累计阅读</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{chapterCount}</div>
              <div className="stat-label">已读章节</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{streak}</div>
              <div className="stat-label">连续天数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{todayMin}m</div>
              <div className="stat-label">今日阅读</div>
            </div>
          </div>

          {history.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 24 }}>
                阅读历史
                <button className="history-clear-btn" onClick={() => { clearHistory() }}>清除</button>
              </div>
              <div className="history-list">
                {displayHistory.map((group, gi) => (
                  <div key={gi}>
                    <div className="history-date">{group.label}</div>
                    {group.items.slice(0, showAllHistory ? 999 : 3).map((item, ii) => (
                      <button
                        key={ii}
                        className="history-item"
                        onClick={() =>
                          navigate(`/reader/${item.categoryId}/${item.bookId}/${item.chapterIdx}`)
                        }
                      >
                        <div className="history-item-book">{item.bookTitle}</div>
                        <div className="history-item-chapter">{item.chapterTitle}</div>
                        <div className="history-item-time">{formatTime(item.timestamp)}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {historyGrouped.length > 3 && !showAllHistory && (
                <button className="history-more-btn" onClick={() => setShowAllHistory(true)}>
                  查看全部 ({history.length} 条)
                </button>
              )}
            </>
          )}

          {history.length === 0 && (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <p style={{ fontSize: 14 }}>暂无阅读记录</p>
            </div>
          )}

          <div className="section-title" style={{ marginTop: 24 }}>阅读设置</div>
          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">主题</span>
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
            </div>
            <div className="settings-row">
              <span className="settings-label">字号</span>
              <div className="font-size-group">
                {(['small', 'medium', 'large', 'xlarge'] as FontSize[]).map((s) => (
                  <button
                    key={s}
                    className={`font-size-btn ${fontSize === s ? 'active' : ''}`}
                    onClick={() => setFontSize(s)}
                  >
                    {fontSizeLabel[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DateGroup { label: string; items: HistoryEntry[] }

function groupByDate(history: HistoryEntry[]): DateGroup[] {
  const groups: DateGroup[] = []
  const today = new Date()
  const todayStr = fmtDate(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = fmtDate(yesterday)

  for (const item of history) {
    const d = new Date(item.timestamp)
    const ds = fmtDate(d)
    let label: string
    if (ds === todayStr) label = '今天'
    else if (ds === yesterdayStr) label = '昨天'
    else if (isThisYear(d)) label = `${d.getMonth() + 1}月${d.getDate()}日`
    else label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`

    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.items.push(item)
    } else {
      groups.push({ label, items: [item] })
    }
  }
  return groups
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isThisYear(d: Date): boolean {
  return d.getFullYear() === new Date().getFullYear()
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

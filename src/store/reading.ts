import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryEntry {
  categoryId: number
  categoryName: string
  bookId: string
  chapterIdx: number
  chapterTitle: string
  bookTitle: string
  timestamp: number
}

interface DailyActivity {
  date: string
  minutes: number
}

interface ReadingState {
  totalMinutes: number
  chaptersRead: Record<string, boolean> // `${bookId}-${chapterIdx}` → true
  dailyActivity: DailyActivity[]
  history: HistoryEntry[]

  addReadingTime: (seconds: number) => void
  markChapterRead: (bookId: string, chapterIdx: number) => void
  addToHistory: (entry: HistoryEntry) => void
  clearHistory: () => void
  getChapterReadCount: () => number
  getBooksCompleted: (books: { id: string; chapterCount: number }[]) => number
  getStreak: () => number
  getTodayMinutes: () => number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MAX_HISTORY = 50

export const useReading = create<ReadingState>()(
  persist(
    (set, get) => ({
      totalMinutes: 0,
      chaptersRead: {},
      dailyActivity: [],
      history: [],

      addReadingTime: (seconds) => {
        if (seconds <= 0) return
        const minutes = seconds / 60
        const key = todayKey()
        set((s) => {
          const act = [...s.dailyActivity]
          const today = act.find((a) => a.date === key)
          if (today) {
            today.minutes += minutes
          } else {
            act.push({ date: key, minutes })
            if (act.length > 90) act.shift()
          }
          return {
            totalMinutes: s.totalMinutes + minutes,
            dailyActivity: act,
          }
        })
      },

      markChapterRead: (bookId, chapterIdx) => {
        const key = `${bookId}-${chapterIdx}`
        set((s) => ({
          chaptersRead: { ...s.chaptersRead, [key]: true },
        }))
      },

      addToHistory: (entry) => {
        set((s) => {
          const h = [entry, ...s.history]
            .filter(
              (e, i, arr) =>
                arr.findIndex(
                  (x) => x.bookId === e.bookId && x.chapterIdx === e.chapterIdx
                ) === i
            )
            .slice(0, MAX_HISTORY)
          return { history: h }
        })
      },

      clearHistory: () => set({ history: [] }),

      getChapterReadCount: () => Object.keys(get().chaptersRead).length,

      getBooksCompleted: (books) => {
        const read = get().chaptersRead
        return books.filter((b) => {
          for (let ci = 0; ci < b.chapterCount; ci++) {
            if (!read[`${b.id}-${ci}`]) return false
          }
          return true
        }).length
      },

      getStreak: () => {
        const act = get().dailyActivity
        if (!act.length) return 0
        const sorted = [...act].sort((a, b) => b.date.localeCompare(a.date))
        const today = todayKey()
        let streak = 0
        const check = new Date(today)
        const hasToday = sorted.some((a) => a.date === today)
        if (!hasToday) check.setDate(check.getDate() - 1)
        for (let i = 0; i < 365; i++) {
          const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`
          const found = sorted.find((a) => a.date === ds && a.minutes > 0)
          if (found) {
            streak++
            check.setDate(check.getDate() - 1)
          } else {
            break
          }
        }
        return streak
      },

      getTodayMinutes: () => {
        const key = todayKey()
        const today = get().dailyActivity.find((a) => a.date === key)
        return today ? today.minutes : 0
      },
    }),
    {
      name: 'ams-reader-reading',
      partialize: (state) => ({
        totalMinutes: state.totalMinutes,
        chaptersRead: state.chaptersRead,
        dailyActivity: state.dailyActivity,
        history: state.history,
      }),
    }
  )
)

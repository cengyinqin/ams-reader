import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'sepia'
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 16,
  medium: 18,
  large: 22,
  xlarge: 26,
}

export function getFontSizePx(size: FontSize): number {
  return FONT_SIZE_MAP[size]
}

interface ReadingProgress {
  categoryId: number
  bookId: string
  chapterIdx: number
  scrollPos: number
  updatedAt: number
}

interface SettingsState {
  theme: Theme
  fontSize: FontSize
  progress: Record<string, ReadingProgress> // key = bookId
  lastRead: { categoryId: number; bookId: string; chapterIdx: number } | null

  setTheme: (theme: Theme) => void
  setFontSize: (size: FontSize) => void
  saveProgress: (categoryId: number, bookId: string, chapterIdx: number, scrollPos: number) => void
  getProgress: (bookId: string) => ReadingProgress | null
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      fontSize: 'medium',
      progress: {},
      lastRead: null,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),

      saveProgress: (categoryId, bookId, chapterIdx, scrollPos) => {
        const key = bookId
        const entry: ReadingProgress = { categoryId, bookId, chapterIdx, scrollPos, updatedAt: Date.now() }
        set((s) => ({
          progress: { ...s.progress, [key]: entry },
          lastRead: { categoryId, bookId, chapterIdx },
        }))
      },

      getProgress: (bookId) => {
        return get().progress[bookId] || null
      },
    }),
    {
      name: 'ams-reader-settings',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        progress: state.progress,
        lastRead: state.lastRead,
      }),
    }
  )
)

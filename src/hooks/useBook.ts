export interface ChapterMeta {
  index: number
  title: string
}

export interface BookMeta {
  id: string
  title: string
  file: string
  chapterCount: number
  chapters: ChapterMeta[]
}

export interface CategoryMeta {
  id: number
  name: string
  books: BookMeta[]
}

export interface IndexData {
  title: string
  source: string
  categories: CategoryMeta[]
}

export interface VerseRef {
  [key: string]: { c: string; t: string }
}

export interface ChapterData {
  index: number
  title: string
  paragraphs: string[]
  verses?: VerseRef
}

export interface BookData {
  id: string
  title: string
  chapters: ChapterData[]
}

let indexCache: IndexData | null = null

export async function fetchIndex(): Promise<IndexData> {
  if (indexCache) return indexCache
  const resp = await fetch('/data/index.json')
  if (!resp.ok) throw new Error(`Failed to fetch index: ${resp.status}`)
  indexCache = await resp.json()
  return indexCache!
}

const bookCache = new Map<string, BookData>()

export async function fetchBook(bookId: string): Promise<BookData> {
  if (bookCache.has(bookId)) return bookCache.get(bookId)!

  const index = await fetchIndex()
  let found: BookMeta | undefined
  for (const cat of index.categories) {
    const b = cat.books.find((x) => x.id === bookId)
    if (b) { found = b; break }
  }
  if (!found) throw new Error(`Book ${bookId} not found`)

  const resp = await fetch(`/data/books/${found.file}`)
  if (!resp.ok) throw new Error(`Failed to fetch book: ${resp.status}`)
  const data: BookData = await resp.json()
  bookCache.set(bookId, data)
  return data
}

export function findBookMeta(index: IndexData, bookId: string): { category: CategoryMeta; bookMeta: BookMeta } | null {
  for (const cat of index.categories) {
    const b = cat.books.find((x) => x.id === bookId)
    if (b) return { category: cat, bookMeta: b }
  }
  return null
}

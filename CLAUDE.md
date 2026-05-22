# CLAUDE.md — 爱灵慕圣书报阅读器

## 项目结构

```
ams-reader/
├── generate_data.py          # 数据转换脚本（外部）
├── public/data/              # 静态数据文件
│   ├── index.json            # 7 分类目录
│   ├── search-index.json     # 6,355 条目搜索索引
│   └── books/                # 564 本单书 JSON
├── src/                      # 源码
├── android/                  # Capacitor Android
└── .github/workflows/        # CI: push main → APK
```

## App 架构

- **框架**: React 18 + Vite + TypeScript
- **路由**: HashRouter（6 条路由）/reader 可带 `?from=search`
- **状态**: Zustand 5 + persist（settings / reading 两个独立 store）
- **跨平台**: Capacitor 5（Android）
- **图标**: 内联 SVG 组件 `src/components/Icons.tsx`（currentColor）
- **样式**: CSS Variables 三级主题 `[data-theme='light|dark|sepia']`
- **主题色**: 暖棕色 `#9b7a5c`

## 关键命令

```bash
cd ams-reader
export PATH="$HOME/.n/bin:$PATH"  # Node 22
npm run dev       # H5 开发 → http://localhost:5174
npm run build     # 生产构建
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 数据格式

与 niwj-reader 的关键差异：章节内容是 `paragraphs: string[]` 而非 `content: string`

```json
{
  "id": "1001",
  "title": "到底有没有神",
  "chapters": [{
    "index": 1,
    "title": "第一篇　怎能说没有神呢",
    "paragraphs": ["段落1", "段落2"]
  }]
}
```

## 路由设计

| Route | Component | Purpose |
|---|---|---|
| `/` | Home | 7 分类入口 + 继续阅读 |
| `/category/:categoryId` | BookList | 分类书籍列表 + 本地搜索过滤 |
| `/book/:categoryId/:bookId` | ChapterList | 章节目录 + 已读标记 |
| `/reader/:categoryId/:bookId/:chapterIdx` | Reader | 章节阅读 |
| `/search` | Search | 三层内部搜索 |
| `/profile` | Profile | 统计 + 历史 + 设置 |

## 搜索架构（Search.tsx）

三层内部导航（非路由，用 `level` state 切换）：
- **L1** 搜索首页：allResults（200 条上限），按分类→书分组
- **L2** 书卷筛选：l2Results / l2BrowseChapters（无关键词浏览模式）
- **L3** 文本定位：fetchBook() 加载章节，HighlightedText 关键词高亮
- 竞态保护：`goL3ReqId` 递增守卫丢弃过期异步响应
- 返回键：pushState 仅推一条 + popstate/Capacitor backButton 双监听

书卷选择器（PickerPanel）：扁平列表，所有书按分类顺序展示，带分类分组标题。

## Reader 核心逻辑

- 阅读计时：setInterval(1s) + visibilityState 控制，30s 批量写入
- 进度保存：800ms 防抖，滚动停止后写入
- 章节切换：URL 路由导航，React Router 参数变化触发数据加载
- 点击控制栏：点击屏幕任意位置 toggle
- `?from=search`: 跳过计时、历史记录、章节标记

## 主题系统

- `ThemeSync` 组件（App 层）：监听 theme → 更新 `<html data-theme>` + `<meta name="theme-color">`
- `index.html` 内联脚本：挂载前读取 localStorage 防闪烁（key: `ams-reader-settings`）
- CSS Variables：`:root` / `[data-theme='dark']` / `[data-theme='sepia']`

## 数据文件

- `public/data/index.json` — 7 分类目录（启动加载，内存缓存）
- `public/data/search-index.json` — 搜索索引（首次搜索懒加载）
- `public/data/books/*.json` — 564 本（按需加载，Map 缓存）

## Git

- 仓库: `cengyinqin/ams-reader`
- CI: `.github/workflows/build-apk.yml`（push main 自动构建 APK）
- Co-Authored-By: zengyinqin <zengyinqin@gmail.com>

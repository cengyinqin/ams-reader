# 爱灵慕圣书报

属灵书报阅读器，数据来自 [ailingmusheng.ren](https://ailingmusheng.ren) 书报系列。

## 书籍分类

| 分类 | 册数 |
|------|------|
| 福音类 | 53 |
| 造就类 | 297 |
| 事奉类 | 147 |
| 读经类 | 32 |
| 传记类 | 4 |
| 期刊类 | 23 |
| 其他 | 8 |
| **合计** | **564** |

## 技术栈

React 18 + Vite + TypeScript + Zustand + Capacitor

## 开发

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # 生产构建
```

## Android

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK 输出：`android/app/build/outputs/apk/debug/app-debug.apk`

## 许可

MIT

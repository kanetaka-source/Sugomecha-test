// Vercel サーバーレス関数のエントリポイント。
// /api/* へのリクエストはすべてここに来て、既存の Express アプリ（server/index.ts）へ渡される。
import app from '../server/index'

export default app

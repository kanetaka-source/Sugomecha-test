# CLAUDE.md — IZUMI SUGO MECHA

自動車整備の研修・スキル管理 B2B SaaS（日本語UI）。**まず `HANDOFF.md` を読むこと**
（現状・起動方法・DBの仕組み・次タスクが全部ある）。ユーザーは非エンジニア。
案内は日本語で、操作は1ステップずつ丁寧に。

## プロジェクト
- フロント: React 18 + TypeScript + Vite 5 + Tailwind 3 + react-router-dom 6（本番: Vercel）
- バック: Express 5 + Prisma 6.19.3（固定）+ PostgreSQL（本番: Supabase）
- 起動: `npm run server`（API 3001）＋ `npm run dev`（5173）。ビルド: `npm run build`
- 本番デプロイの詳細は `HANDOFF.md`「10. デプロイ（Supabase + Vercel）」参照。ローカルは `.env` に
  `DATABASE_URL` / `DIRECT_URL`（Supabase接続文字列）を設定して使う（`.env.example` 参照）。

## 守るルール
- 色・余白は **`src/styles/tokens.css` の CSS変数が唯一の真実の源**。`bg-brand` `text-muted` 等で参照。
  - `bg-success`/`bg-warning` は無い → `bg-ok`(緑) / `bg-gold`(琥珀)。
- 新規画面: `src/pages/XxxPage.tsx` を作り、`src/App.tsx` の children（必要なら `AppShell`/`AdminShell` の nav）に登録。
- DB窓口は `src/lib/api.ts`。ログインユーザーは `src/lib/currentUser.ts`（roleは持たない→employeesから引く）。
- 評価実績は社員ごとにDB保存（`EvalStamp` / `evalStampsApi` / `stampsToSet`）。

## Prisma マイグレーション（重要）
1. **APIサーバを止める** 2. `server/prisma/schema.prisma` 編集
3. `npx prisma migrate dev --name X --schema server/prisma/schema.prisma` 4. サーバ再起動

## いま進行中のタスク
**手順書採点画面**: ProgressPage で管理者評価スタンプを押す際、項目に手順書があれば
各手順を合否採点（全手順合格→スタンプON、合否は社員ごとDB保存）。詳細は HANDOFF.md「7.」。

## テストログイン
E001=評価者 / E002・E003=受講者（大型研修 id=1 履修済み）/ 全員パスワード `test1234`

## Figma 連携
公式MCP（Dev Mode）。fileKey `q03d9K34YoDkD3LiuG15vy`。画面単位のnodeを指定（全体は重くて落ちる）。

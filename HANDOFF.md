# IZUMI SUGO MECHA — 開発引き継ぎ

自動車整備の研修・スキル管理 B2B SaaS（日本語UI）。Figma デザインから実装。
**新しいセッションはまずこの HANDOFF.md を読めば続きを作れます。**

---

## 0. いまの状況（最重要）

- フロント（多数の画面）＋ バックエンド（Express + Prisma + SQLite）まで実装済み。
- ログイン認証・評価実績の社員ごとDB保存まで動作確認済み。
- **「手順書採点画面」は実装・動作確認済み（2026-07-01 完了）**。詳細は「7. 手順書採点（実装済み）」参照。
- **進行中タスク（次にやること）**: 未定。次の画面・機能はユーザーと相談して決める。

---

## 1. セットアップ / 起動

```bash
cp .env.example .env   # DATABASE_URL / DIRECT_URL を Supabase の接続文字列に書き換える
npm install             # postinstall で prisma generate が自動実行される

# 初回のみ: Supabase 上にテーブルを作成
npm run db:migrate:dev -- --name init

# 1) APIサーバ（ポート 3001）
npm run server

# 2) フロント（別ターミナルで。Vite 5173）
npm run dev          # http://localhost:5173

npm run build        # 本番ビルド（tsc -b + vite build）
```

DBは PostgreSQL（Supabase）。Prisma スキーマは `server/prisma/schema.prisma`。
本番デプロイの手順は「10. デプロイ（Supabase + Vercel）」を参照。

### テスト用ログイン
- `E001` … ロール「評価者」（評価入力ができる）
- `E002` / `E003` … ロール「受講者」（大型研修コース id=1 に履修登録済み）
- パスワードは全員 `test1234`

---

## 2. 技術スタック

- フロント: React 18 + TypeScript + Vite 5 + Tailwind 3 + react-router-dom 6（本番ホスティング: **Vercel**）
- バック: Express 5 + Prisma 6.19.3（**バージョン固定。上げない**）+ PostgreSQL（本番DB: **Supabase**）
  - 本番では `api/index.ts` が Express アプリをそのままサーバーレス関数として公開（`/api/*` → この関数）
  - Prisma の `DATABASE_URL`（接続プーラー・実行時用）と `DIRECT_URL`（直接接続・マイグレーション用）を分離
- フォント: 本文 Zen Maru Gothic / ロゴ Orbitron（index.html で読込済み）

---

## 3. デザイントークン（色・余白の唯一の真実の源）

`src/styles/tokens.css` が真実の源。直書きせず Tailwind の `bg-brand` 等で参照する。

主なクラス: `bg-brand` `bg-accent` `bg-ok`(緑) `bg-gold`(琥珀) `bg-danger`(赤)
`bg-disabled` `bg-magenta` `bg-gauge`(グラデ) / 文字 `text-ink` `text-ink2` `text-muted` / 罫線 `border-line` `border-line2`。

> 注意: `bg-success` / `bg-warning` は**存在しない**。成功=`bg-ok`、警告=`bg-gold` を使う。

---

## 4. ディレクトリ / 主要ファイル

```
server/
  index.ts                Express API（全エンドポイント）
  prisma/schema.prisma    Prismaモデル（DB定義）
  prisma/dev.db           SQLite本体
src/
  App.tsx                 ルーティング（ユーザー画面 / admin画面）
  lib/
    api.ts                APIクライアント + 型（フロントのDB窓口）
    currentUser.ts        ログインユーザー（localStorage izumi.currentUser）
    evalProgress.ts       評価実績ヘルパ（stampsToSet / isItemEvaluated / 優先星）
  components/
    AppShell.tsx          ユーザー側レイアウト（ヘッダー＋ナビ＋プロフィールアイコン）
    AdminShell.tsx        管理画面レイアウト
    TrainingCard.tsx      研修メニューカード（自己評価/作業待ち/進捗状況ボタン）
    icons.tsx             SVGアイコン（IconStar=立体星 等）
  pages/
    DashboardPage.tsx     ホーム（研修メニュー、カードD&D並び替え）
    JikoHyokaPage.tsx     自己評価（自己評価は本人編集可・管理者評価は読取専用）
    ProgressPage.tsx      進捗状況（拠点/部署/社員/コースで絞込、評価者/管理者は管理者評価を編集可）★次タスクの主舞台
    MachiPage.tsx         作業待ち（コース別・常時5枠）
    ProfilePage.tsx       プロフィール（成績/バッジ）
    ShikakuPage.tsx       資格（本人の保有資格）
    ExamPage.tsx          筆記試験 受験
    （admin系）ShainFormPage / ShikenMaster系 / HikkiShinseiPage ほか
```

---

## 4.4 筆記試験申請（`HikkiShinseiPage` /admin/hikki-shinsei）（2026-07-08 修正）

- 状態フィルタの初期値は「申請中」（対応が必要な申請を最初に表示）。
- 合否結果は**手動プルダウンを廃止**し、筆記試験（受験）の結果を**読み取り専用バッジ**で表示：
  合格(緑)/不合格(赤)/未受験(灰)。結果は受講者が `ExamPage` で受験完了時に自動記録される（`examApplicationsApi.setResult`）。
  → この画面では結果を変更しない（表示のみ）。

## 4.2 バッジ（ホーム画面ステータス `StatusCard`）（2026-07-09）

- 場所: ホーム(`DashboardPage`)上部の `StatusCard`。バッジ値は `DashboardPage` が実データから算出して props で渡す
  （`master: MasterBadgeVM[]` / `special: SpecialBadgeVM[]`）。※ProfilePageのバッジは対象外（元のまま）。
- **マスターバッジ＝研修コースごと**。完了判定は `isItemAllPassed`（自己＋管理者評価の有効全列が合格）。
  - ブロンズ: 項目を1つ以上完了 / シルバー: セクション(STEP)を1つ以上完了(全項目完了) / ゴールド: 全セクション完了。上位優先。
  - 段階判定は `DashboardPage` の `courseTier(courseId)`。
  - デザインは既存の王冠画像そのまま。ゴールド=`crownOn`、シルバー/ブロンズは同画像にCSSフィルタで色替え
    （`StatusCard` の `TIER_FILTER`: silver=grayscale、bronze=sepia系）、未獲得=`crownOff`。下にゴールド/シルバー/ブロンズのラベル。
- **スペシャルバッジ**（メダル画像 on/off）:
  - 評価者: ログイン社員の `role === '評価者'`（`employeesApi.get` で取得）。
  - 2/3/4階級制覇: ゴールドのマスターバッジ数が 2/3/4 以上。
  - 全階級制覇: 全研修コースがゴールド（`goldCount === courses.length`）。
- 注: 研修メニューの進捗％(`progressFor`)は従来通り `isItemEvaluated`（管理者評価まで）。バッジとは別基準。

## 4.3 点数一覧（`TensuPage` /admin/tensu）（2026-07-09・給与計算用）

- 対象社員: **管理者を除く全社員**（受講者・評価者）。集計対象外は管理者のみ。**拠点別グループ**・社員単位で表示。
- 得点: **研修項目の自己評価＋管理者評価の“有効な全列”が合格した項目を1点**（`isItemAllPassed`）。
  合格判定: カウント=目標到達 / それ以外(印・チェック・点数・手順書採点)=押印済み。**研修コースごとに合計**＋全コース合計。
- **CSV出力**: 拠点/部署/社員番号/氏名/ロール/各コース得点/合計。Excel(日本語)向けにBOM付きUTF-8・CRLF。
- API: `GET /api/eval-stamps`（employeeId 省略で全社員分＋employeeId付き）、`evalStampsApi.listAll()`。
- 判定は `src/lib/evalProgress.ts` の `isItemAllPassed`（自己＋管理者の全列。`isItemEvaluated` は管理者優先＝別物）。

## 4.5 作業待ち（2026-07-02 / 2026-07-08 拡張）

- `MachiPage`（`/machi`）: 行の工程/内容クリックで `/machi/:itemId`（`MachiDetailPage`）へ。
  タイトル横に「(セクション名) 合計 N人」、各行に「N人 ›」。
- `MachiDetailPage`（`/machi/:itemId`）: 対象項目＋作業待ちユーザーを**最大10人**（`WAITING_MAX`）番号付きカード表示。
- 母集団ロジック: ★優先(`loadPrioritySet`)項目は全受講者、それ以外は当該コース履修者（社員＋履修から算出）。
- **作業待ちユーザーのカードをクリック → その社員の進捗状況へ**（`/shinchoku?employeeId=&category=`）。
  ProgressPage は `employeeId` クエリを読んで対象社員を初期選択。
- **D&D並び替え（評価者/管理者のみ、`canReorder`）**: 一覧の5枠・詳細の最大10枠でカードをドラッグして順序変更。
  順序は DB (`WaitingOrder{itemId,employeeId,position}`, マイグレーション `20260708203331_waiting_order`) に保存。
  API: `GET/PUT /api/waiting-orders`（PUTは `{itemId, employeeIds[]}` で position 0..N 置換）、`waitingOrdersApi`。
  並べ替え・手動判定は `src/lib/waiting.ts` の `orderWaiting`（保存順で整列、1件でもあれば manual=true）/ `reorder`。
- **手動並び替え済み判定＝既定順との差分**（2026-07-08）: `orderWaiting` は並び替え結果が既定順（母集団の順）と
  一致すれば `manual=false`。よって**本来の順に戻すと「手動」表記は自動的に消える**。
  さらに D&D で既定順に戻したら `persistOrder` が `sameOrder` 判定で保存を空(`[]`)にしてDB行もクリア。
- **移動したユーザーの明示**: 本来の位置(既定順の index)と現在位置が違うカードに金枠＋「元◯位」バッジを表示。
  一覧は各行に「手動」、詳細は「手動並び替え済み」バッジ。判定に `sameOrder`（`src/lib/waiting.ts`）。
- ★スロット/カードは `key` 衝突回避のため空き枠 `slot-${i}` / 社員 `emp-${id}` を使用。

## 5. 重要な仕組み（覚えておくこと）

### ログインユーザー
- `localStorage` キー `izumi.currentUser` に `{id, employeeNo, name}`（**roleは持たない**）。
- ロールが要る画面は `employeesApi.list()` から `currentUser.id` で引いて `e.role` を見る。
- 取得: `getCurrentUser()` / ログイン時セット: `setCurrentUserFromEmployee(e)`。

### 評価実績（スタンプ）は社員ごとにDB保存
- モデル `EvalStamp { employeeId, itemId, kind('self'|'admin'), idx }`（@@unique 4項）。
- API: `evalStampsApi.list(employeeId)` / `evalStampsApi.set(employeeId, itemId, kind, idx, value)`。
- フロントでは Set<string> で扱う。キー文字列は `` `${itemId}-${kind}-${idx}` ``。
- DB行→Set変換は `stampsToSet(list)`（`src/lib/evalProgress.ts`）。
- 項目が「評価済み」か判定は `isItemEvaluated(itemId, section, stamps)`。

### 手順書（Procedure）
- `TrainingMaterial.procedure` に **JSON文字列**で保存。
- 形: `{ stepHeader, pointHeader, steps: [{ name, points: string[] }] }`。
- 教材(Material)は `itemId` で研修項目に紐づく。

### Prisma マイグレーション手順（データ消失を防ぐ）
1. **APIサーバを止める**（DBロック回避）
2. `server/prisma/schema.prisma` を編集
3. `npx prisma migrate dev --name 変更名 --schema server/prisma/schema.prisma`
   （カラム追加など加算的変更は非対話で通る）
4. サーバ再起動

### localStorage キー一覧
`izumi.auth` / `izumi.savedLoginId` / `izumi.currentUser` / `izumi.courseOrder` /
`izumi.menuOrder.operation`・`.master` / `izumi.priorityStars`（優先星=最大5）。

---

## 6. ルーティング（src/App.tsx）

- ユーザー側（`/` 配下, AppShell）: dashboard / jiko-hyoka / machi / shikaku / shinchoku /
  profile / seiseki / exam/:sectionId / kenshu-detail/:itemId
- 管理側（`/admin` 配下, AdminShell）: 各マスタ（社員/部署/拠点/研修コース・セクション・項目・教材/資格/権限/保有資格/試験マスタ）/ hikki-shinsei ほか

---

## 7. 手順書採点（実装済み・2026-07-01）

仕様: 進捗状況画面で **管理者評価セル**を押す → その項目に手順書があれば**採点モーダル**を開く →
**各工程の「見るべきポイント」ごと**に 合格/不合格 を入力＋**コメント**（任意）を記入 →
保存時に **全ポイント合格なら結果=合格（緑の「合」スタンプ）**、1つでも不合格なら**結果=不合格（赤の「否」スタンプ）**。
合格時のみ管理者評価スタンプ(EvalStamp)もONにし進捗集計に反映。採点・コメント・結果は社員ごとDB保存。
（手順書が無い項目・自己評価セルは従来通り単純トグル「印」）

実装内容:
1. **DBモデル**（`server/prisma/schema.prisma`。マイグレーション `20260630205251_add_procedure_grades` →
   `20260630210942_procedure_points_and_eval`）:
   - `ProcedureGrade { employeeId, itemId, stepIndex, pointIndex, pass, @@unique([employeeId,itemId,stepIndex,pointIndex]) }`
     … 見るべきポイント単位の合否。
   - `ProcedureEval { employeeId, itemId, result('pass'|'fail'), comment, @@unique([employeeId,itemId]) }`
     … 総合結果＋コメント（スタンプ表示の判定に使う）。
   - Employee / TrainingItem に `procedureGrades` / `procedureEvals` リレーション。
2. **API**（`server/index.ts`）:
   - `GET /api/procedure-grades?employeeId=&itemId=` → `{grades:[{stepIndex,pointIndex,pass}], result, comment}`
   - `PUT /api/procedure-grades`（body: `{employeeId,itemId,grades,result,comment}`）→ grades置換＋eval upsert。
   - `GET /api/procedure-evals?employeeId=` → `[{itemId,result,comment}]`（スタンプ一覧表示用）。
   - `src/lib/api.ts`: `procedureGradesApi`(get/save) / `procedureEvalsApi`(list) と型を追加。
3. **ProgressPage**（`src/pages/ProgressPage.tsx`）:
   - `procedureUnits(procedure)` で手順書を採点単位（工程×見るべきポイント）に展開。
   - 社員選択時に `procedureEvalsApi.list` で `itemId→{result,comment}`（`evalByItem`）を取得。
   - 手順書ありの管理者評価セルは `ResultStampCell` で 合(緑)/否(赤)/印(未採点) を表示。
   - モーダル: ポイントごとの合否トグル＋コメント欄。`saveGrades()` が `procedureGradesApi.save` ＋
     `evalStampsApi.set(..,'admin',idx,全合格)`、`evalByItem`/`stamps` を即時更新。

マイ成績ダッシュボード（2026-07-01・`src/pages/SeisekiPage.tsx`＝ナビ「成績」/seiseki）:
- ログイン社員の成績を集約表示。旧モックの棒グラフ画面を実データに刷新。
- 構成: ①総合達成率(ProgressRing)＋統計タイル（評価済み/手順採点合格/筆記合格/保有資格）
  ②要対応（手順採点の不合格・未取得の必要資格・期限60日以内/切れの資格）
  ③コース別/セクション別 進捗バー ④手順書採点結果（合否・採点者・日時・コメント）
  ⑤筆記試験結果（`examApplicationsApi`）⑥保有資格（`heldQualificationsApi`・期限警告）。
- API拡張: `GET /api/procedure-evals` に `gradedByName` / `gradedAt`(updatedAt) を追加（型 `ProcedureEval`）。
- 進捗判定は `isItemEvaluated`（管理者評価の全列スタンプ）。履修コースは `employee.enrolledCourses`（無ければ全コース）。

カウント評価（2026-07-02）:
- 研修セクションマスタの評価種別に「カウント」を追加（`EVAL_TYPES`）。種別=カウント時、列ごとに目標回数(1〜10, `EVAL_COUNT_MAX`)を設定。
- DB: `TrainingSection` に `selfEval1-2Count` / `adminEval1-3Count`（目標回数）。`EvalStamp` に `count`（現在回数）。
  マイグレーション `20260702011515_eval_count`。
- API: `buildSectionData` が *Count を0〜10でクランプ保存。`GET /api/eval-stamps` が count 返却、
  `PUT /api/eval-stamps` は body に `count`(数値)が来たらカウント保存（0以下で解除）。`evalStampsApi.setCount`。
- 評価画面（ProgressPage / JikoHyokaPage）: カウント列は `CountCell`（現在/目標, ＋−。目標到達で緑「達成」）。
  ProgressPageは評価者が操作可、JikoHyokaPageは自己評価列のみ本人操作可・管理者列は閲覧専用。
- 達成判定: `isItemEvaluated` を count 対応に更新（カウント列は count≧目標で達成）。Profile/Dashboard/Seiseki は
  `countsToMap` で counts を渡す。カウント列は手順書採点より優先（カウンター表示）。
- 既知: `preview_resize` を preset/native にすると幅1pxになる。明示的に width/height 指定で回避。

UI調整（2026-07-01）:
- 「手順採点」バッジ表記は削除（セルのスタンプ自体が採点導線）。
- スタンプ表示を統一: 押印/自己評価チェック済み＝合格の印 **「合」(緑)**、未チェック＝「印」(灰)、不合格＝「否」(赤)。
- **自己評価画面(`JikoHyokaPage`)でも管理者の採点結果(合/否)を閲覧可能**（読取専用 `ResultStampCell`）。
  ログイン社員の `procedureEvalsApi.list` を `evalByCell`（`${itemId}-${idx}`）で保持し、手順書付き管理者評価列に表示。
  採点済みセルをクリックすると **閲覧専用モーダル**（`viewModal`）で総合結果＋ポイント別合否＋コメント＋
  **採点者名・採点日時**を表示（`procedureGradesApi.get(currentUser.id, itemId, idx)` で取得）。受講者は閲覧のみ。
- 採点者・日時: `ProcedureEval` に `gradedById` / `gradedByName` を保持（マイグレーション `20260630214632_procedure_eval_grader`）、
  採点日時は `updatedAt`。保存時にフロントが採点者(currentUser)を渡し、ProgressPageの採点モーダルにも
  「前回の採点：氏名（日時）」を表示。日時整形は各ページの `formatDateTime`（ja-JP）。

採点の独立単位（2026-07-01 改修・マイグレーション `20260630212211_procedure_per_idx`）:
- 採点は **項目 × 管理者評価列(idx) 単位で独立**。例: 「管理者評価」(idx2) と「実技試験」(idx3) は別々に採点・結果・コメントを持つ。
- `ProcedureGrade`/`ProcedureEval` に `idx` を追加（unique もidxを含む）。API/フロントは `idx` を必須で受け渡す。
- フロントは結果を `evalByCell`（キー `${itemId}-${idx}`）で保持し、各列セルが自分のidxの結果を表示。
- 管理者評価の idx はセクション設定により可変（例: adminEval2/3 有効なら「管理者評価」=idx2、「実技試験」=idx3）。
- クリックした列の EvalStamp のみ合格時ON（進捗集計 `isItemEvaluated` 用）。
- ポイントが未登録の工程は「工程全体で1単位」として採点（pointIndex=0）。

---

## 8. つまずきポイント / 既知の注意

- **`bg-success`/`bg-warning` は無い** → `bg-ok` / `bg-gold`。
- **Prisma は止めてからマイグレーション**（動かしたままだとロック/データ消失リスク）。
- preview の `preview_resize "native"` で幅が1pxになるバグ → 明示的に `width:1280, height:880` を渡す。
- `.sandbox-tmp/` は不要ファイル。削除してよい（.gitignore済み）。
- Figma MCP の fileKey は `q03d9K34YoDkD3LiuG15vy`。アセットURLは7日で失効。

---

## 8.5 新着情報（通知）＋ ホームtotal point（2026-07 追加）

### ホーム total point
- 固定値（旧 `data.ts` の `totalPoint`）を廃止。DashboardPage で **全合格した研修項目数 / 全研修項目数** を計算し
  `StatusCard` に `points={{current,total}}` で渡す（1点＝`isItemAllPassed` の項目）。

### 通知の仕組み
- **DB**: `Notification`（scope=user/location/all, recipientId, locationId, excludeId, audience=home/admin,
  category, title, body, link, actorName, dedupeKey@unique）＋ `NotificationRead`（notificationId,employeeId で既読）。
- **サーバーヘルパ**（`server/index.ts`）: `notify()`（dedupeKey で重複防止）, `notifyMaster()`（ホーム全員＋管理画面）,
  `getEmployeeLocationId()`。
- **API**: `GET /api/notifications?employeeId&audience`（read付与）, `POST /notifications/read` `/read-all`,
  `POST /notifications/badge` `/qual`（クライアント検知の派生通知）。クライアントは `notificationsApi`（api.ts）。
- **イベント発火箇所**: procedure-grades PUT（評価結果＋同拠点合格）, eval-stamps PUT（admin印ON/カウント目標到達）,
  exam POST/approve/result, マスタCRUD（コース/セクション/項目/教材）, held-qualifications POST（資格追加）,
  waiting-orders PUT（順変更＋1位）。
- **派生通知**（バッジ付与・資格期限）は DashboardPage 読み込み時に検知して `emitBadge`/`emitQual`。
  サーバーの dedupeKey で重複生成なし。資格期限は **60日前**から「迫っている」。
- **他者合格の宛先＝同じ拠点の全員**（scope=location, excludeId=本人）。
- **UI**: `src/components/NotificationFeed.tsx`（ホーム＝DashboardPage / 管理画面＝AdminHomePage で共通）。
  スクロール・カテゴリチップ・未読ドット・クリックで遷移＋既読・「すべて既読にする」。
- **未実装メモ**: 「作業待ち1位」は手動並び替え時のみ通知（自然に1位へ繰り上がった場合の検知は未対応）。

### ランキング画面（ヘッダー「報告書」→「ランキング」に置換）
- `AppShell` nav の `/houkoku 報告書` を **`/ranking ランキング`（IconGraphLine）** に変更。ルートは App.tsx の AppShell children に登録。
- `src/pages/RankingPage.tsx`: 点数一覧(TensuPage)と同じ得点ロジック（`isItemAllPassed`＝1点）。
  指標タブ「合計／研修コース別」＋拠点フィルタで、得点降順にランク付け（同点は同順位）。
  ログイン中ユーザーは「あなた」でハイライト。対象は管理者を除く全社員。
- 追加仕様:
  - **名前クリックでその社員の成績へ**: `/seiseki?employeeId=X`。SeisekiPage が `useSearchParams` で `employeeId` を受け、
    他ユーザー表示時は「← ランキングへ戻る」を表示（自分の時は従来どおり）。
  - **最終得点更新日**: `GET /api/score-updates`（`scoreUpdatesApi`）= EvalStamp.createdAt と ProcedureEval.updatedAt の最大。
  - **順位変動 ▲▼/NEW**: 前回順位を localStorage `izumi.rankPrev`（指標ごと）に保存し比較。全体順位のみ記録（拠点フィルタ中は非表示）。
    セッション開始時のスナップショットと比較し、表示後に現在順位を保存（＝「前回表示時からの変動」）。
  - **順位アイコン**: 1〜3位は金銀銅のSVGメダル（`Medal` コンポーネント）、4位以降は番号ディスク。

---

## 9. 検証済み

- `npm run build` 成功 / API 200 / 主要画面 200。

---

## 10. デプロイ（Supabase + Vercel）

### 10.1 Supabase（DB）
1. https://supabase.com でプロジェクトを新規作成（リージョンは `ap-northeast-1` 東京 推奨）。
2. 作成時に設定した DB パスワードを控える。
3. **Project Settings → Database → Connection string** を開き、
   - **Transaction pooler**（ポート `6543`）の文字列 → `.env` の `DATABASE_URL`（末尾に `?pgbouncer=true&connection_limit=1` を付与）
   - **Direct connection**（ポート `5432`）の文字列 → `.env` の `DIRECT_URL`
   にそれぞれコピーする（`.env.example` がテンプレート）。
4. ローカルで一度だけテーブルを作成:
   ```bash
   npm run db:migrate:dev -- --name init
   npm run db:seed   # 初期データ・テストログインを投入する場合
   ```
   これで `server/prisma/migrations/` に Postgres 用の初回マイグレーションが作られる。
   （旧 SQLite 時代のマイグレーションは `server/prisma/_migrations_sqlite_backup/` に退避済み・参照専用）

### 10.2 Vercel（フロント + API）
1. このリポジトリを GitHub 等に push し、Vercel でリポジトリを Import（Framework は自動検出で問題なし。
   `vercel.json` に buildCommand/outputDirectory/rewrites を定義済み）。
2. **Project Settings → Environment Variables** に以下を追加（Production / Preview 両方）:
   - `DATABASE_URL`（Supabase の Transaction pooler・6543）
   - `DIRECT_URL`（Supabase の Direct connection・5432）
3. Deploy を実行。ビルド時に `postinstall` で `prisma generate` が自動実行される。
4. デプロイ後、`https://<プロジェクト>.vercel.app/api/health` で `{"ok":true}` が返れば API 疎通OK。

### 10.3 本番でのマイグレーション更新（スキーマを変更した後）
ローカルで `server/prisma/schema.prisma` を編集して `npm run db:migrate:dev -- --name 変更名` を実行し、
生成された `migrations/` フォルダを git commit → push すると、次回 Vercel デプロイ時にも反映される
（`npm run db:migrate:deploy` を Vercel のビルド前に実行したい場合は buildCommand に追加してもよい）。

### 10.4 仕組みの要点
- `server/index.ts` の Express アプリは `export default app` されており、`api/index.ts` がそれを
  Vercel のサーバーレス関数としてそのまま公開している（ルートは全て `/api/...` のまま変更不要）。
- ローカル実行時は `!process.env.VERCEL` の分岐で今まで通り `app.listen(3001)` する。
- PrismaClient はグローバルにキャッシュ（サーバーレスでの接続過多を防止）。
- 評価者E001 が E002 にスタンプ → DBに `{itemId, kind:'admin', idx}` 保存を確認。
- ProgressPage のロール制御（評価者/管理者のみ管理者評価を編集可）動作確認済み。
- 通知: ホーム/管理フィード表示・クリック遷移・既読の永続化・他者合格が同拠点のみ（別拠点E3は非表示）を確認。
- total point がホームで実データ（例: 4/9pt）表示を確認。

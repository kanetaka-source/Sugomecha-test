-- 保有資格: 取得日・有効期限を追加（人ごと）
ALTER TABLE "HeldQualification" ADD COLUMN "acquiredDate" DATETIME;
ALTER TABLE "HeldQualification" ADD COLUMN "validUntil" DATETIME;

-- 資格マスタ: 有効期限(validUntil)を削除（テーブル再作成。name/category/日時は保持）
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Qualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Qualification" ("id", "name", "category", "createdAt", "updatedAt")
SELECT "id", "name", "category", "createdAt", "updatedAt" FROM "Qualification";
DROP TABLE "Qualification";
ALTER TABLE "new_Qualification" RENAME TO "Qualification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

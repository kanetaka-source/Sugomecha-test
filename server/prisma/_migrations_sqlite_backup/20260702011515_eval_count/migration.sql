-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EvalStamp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvalStamp_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvalStamp_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EvalStamp" ("createdAt", "employeeId", "id", "idx", "itemId", "kind") SELECT "createdAt", "employeeId", "id", "idx", "itemId", "kind" FROM "EvalStamp";
DROP TABLE "EvalStamp";
ALTER TABLE "new_EvalStamp" RENAME TO "EvalStamp";
CREATE UNIQUE INDEX "EvalStamp_employeeId_itemId_kind_idx_key" ON "EvalStamp"("employeeId", "itemId", "kind", "idx");
CREATE TABLE "new_TrainingSection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "courseId" INTEGER,
    "header1Flag" BOOLEAN NOT NULL DEFAULT true,
    "header1Name" TEXT,
    "header2Flag" BOOLEAN NOT NULL DEFAULT false,
    "header2Name" TEXT,
    "header3Flag" BOOLEAN NOT NULL DEFAULT false,
    "header3Name" TEXT,
    "header4Flag" BOOLEAN NOT NULL DEFAULT false,
    "header4Name" TEXT,
    "header5Flag" BOOLEAN NOT NULL DEFAULT false,
    "header5Name" TEXT,
    "selfEval1Flag" BOOLEAN NOT NULL DEFAULT false,
    "selfEval1Type" TEXT,
    "selfEval1Name" TEXT,
    "selfEval1Count" INTEGER NOT NULL DEFAULT 0,
    "selfEval2Flag" BOOLEAN NOT NULL DEFAULT false,
    "selfEval2Type" TEXT,
    "selfEval2Name" TEXT,
    "selfEval2Count" INTEGER NOT NULL DEFAULT 0,
    "adminEval1Flag" BOOLEAN NOT NULL DEFAULT false,
    "adminEval1Type" TEXT,
    "adminEval1Name" TEXT,
    "adminEval1Count" INTEGER NOT NULL DEFAULT 0,
    "adminEval2Flag" BOOLEAN NOT NULL DEFAULT false,
    "adminEval2Type" TEXT,
    "adminEval2Name" TEXT,
    "adminEval2Count" INTEGER NOT NULL DEFAULT 0,
    "adminEval3Flag" BOOLEAN NOT NULL DEFAULT false,
    "adminEval3Type" TEXT,
    "adminEval3Name" TEXT,
    "adminEval3Count" INTEGER NOT NULL DEFAULT 0,
    "examPassLine" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingSection" ("adminEval1Flag", "adminEval1Name", "adminEval1Type", "adminEval2Flag", "adminEval2Name", "adminEval2Type", "adminEval3Flag", "adminEval3Name", "adminEval3Type", "courseId", "createdAt", "examPassLine", "header1Flag", "header1Name", "header2Flag", "header2Name", "header3Flag", "header3Name", "header4Flag", "header4Name", "header5Flag", "header5Name", "id", "name", "note", "selfEval1Flag", "selfEval1Name", "selfEval1Type", "selfEval2Flag", "selfEval2Name", "selfEval2Type", "sortOrder", "updatedAt") SELECT "adminEval1Flag", "adminEval1Name", "adminEval1Type", "adminEval2Flag", "adminEval2Name", "adminEval2Type", "adminEval3Flag", "adminEval3Name", "adminEval3Type", "courseId", "createdAt", "examPassLine", "header1Flag", "header1Name", "header2Flag", "header2Name", "header3Flag", "header3Name", "header4Flag", "header4Name", "header5Flag", "header5Name", "id", "name", "note", "selfEval1Flag", "selfEval1Name", "selfEval1Type", "selfEval2Flag", "selfEval2Name", "selfEval2Type", "sortOrder", "updatedAt" FROM "TrainingSection";
DROP TABLE "TrainingSection";
ALTER TABLE "new_TrainingSection" RENAME TO "TrainingSection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

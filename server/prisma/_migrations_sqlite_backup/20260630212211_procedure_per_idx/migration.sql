-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProcedureEval" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcedureEval_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcedureEval_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProcedureEval" ("comment", "createdAt", "employeeId", "id", "itemId", "result", "updatedAt") SELECT "comment", "createdAt", "employeeId", "id", "itemId", "result", "updatedAt" FROM "ProcedureEval";
DROP TABLE "ProcedureEval";
ALTER TABLE "new_ProcedureEval" RENAME TO "ProcedureEval";
CREATE UNIQUE INDEX "ProcedureEval_employeeId_itemId_idx_key" ON "ProcedureEval"("employeeId", "itemId", "idx");
CREATE TABLE "new_ProcedureGrade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "stepIndex" INTEGER NOT NULL,
    "pointIndex" INTEGER NOT NULL DEFAULT 0,
    "pass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcedureGrade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcedureGrade_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProcedureGrade" ("createdAt", "employeeId", "id", "itemId", "pass", "pointIndex", "stepIndex", "updatedAt") SELECT "createdAt", "employeeId", "id", "itemId", "pass", "pointIndex", "stepIndex", "updatedAt" FROM "ProcedureGrade";
DROP TABLE "ProcedureGrade";
ALTER TABLE "new_ProcedureGrade" RENAME TO "ProcedureGrade";
CREATE UNIQUE INDEX "ProcedureGrade_employeeId_itemId_idx_stepIndex_pointIndex_key" ON "ProcedureGrade"("employeeId", "itemId", "idx", "stepIndex", "pointIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "ProcedureGrade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "pass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcedureGrade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcedureGrade_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureGrade_employeeId_itemId_stepIndex_key" ON "ProcedureGrade"("employeeId", "itemId", "stepIndex");

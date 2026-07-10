-- CreateTable
CREATE TABLE "WaitingOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitingOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitingOrder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitingOrder_itemId_employeeId_key" ON "WaitingOrder"("itemId", "employeeId");

-- CreateTable
CREATE TABLE "TrainingItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sectionId" INTEGER,
    "flag1" BOOLEAN NOT NULL DEFAULT true,
    "value1" TEXT,
    "flag2" BOOLEAN NOT NULL DEFAULT false,
    "value2" TEXT,
    "flag3" BOOLEAN NOT NULL DEFAULT false,
    "value3" TEXT,
    "flag4" BOOLEAN NOT NULL DEFAULT false,
    "value4" TEXT,
    "flag5" BOOLEAN NOT NULL DEFAULT false,
    "value5" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrainingSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

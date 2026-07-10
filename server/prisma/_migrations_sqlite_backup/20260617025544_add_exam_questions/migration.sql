-- AlterTable
ALTER TABLE "TrainingSection" ADD COLUMN "examPassLine" INTEGER;

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL DEFAULT true,
    "explanation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sectionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrainingSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

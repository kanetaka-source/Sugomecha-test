-- CreateTable
CREATE TABLE "ExamApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sectionId" INTEGER,
    "applicantId" INTEGER,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT '申請中',
    "approvedAt" DATETIME,
    "result" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamApplication_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrainingSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExamApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

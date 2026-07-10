-- CreateTable
CREATE TABLE "_ItemRequiredQuals" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ItemRequiredQuals_A_fkey" FOREIGN KEY ("A") REFERENCES "Qualification" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItemRequiredQuals_B_fkey" FOREIGN KEY ("B") REFERENCES "TrainingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ItemRequiredQuals_AB_unique" ON "_ItemRequiredQuals"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemRequiredQuals_B_index" ON "_ItemRequiredQuals"("B");

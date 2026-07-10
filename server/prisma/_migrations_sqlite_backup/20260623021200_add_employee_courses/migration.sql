-- CreateTable
CREATE TABLE "_EmployeeCourses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_EmployeeCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EmployeeCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "TrainingCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeCourses_AB_unique" ON "_EmployeeCourses"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeCourses_B_index" ON "_EmployeeCourses"("B");

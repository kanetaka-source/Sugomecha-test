-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "locationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSection" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL DEFAULT true,
    "explanation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sectionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingItem" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalStamp" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureGrade" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "stepIndex" INTEGER NOT NULL,
    "pointIndex" INTEGER NOT NULL DEFAULT 0,
    "pass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureEval" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT NOT NULL,
    "comment" TEXT,
    "gradedById" INTEGER,
    "gradedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureEval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitingOrder" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingMaterial" (
    "id" SERIAL NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "attachmentUrl" TEXT,
    "procedure" TEXT,
    "itemId" INTEGER,
    "detail1Flag" BOOLEAN NOT NULL DEFAULT true,
    "detail1Title" TEXT,
    "detail1Content" TEXT,
    "detail2Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail2Title" TEXT,
    "detail2Content" TEXT,
    "detail3Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail3Title" TEXT,
    "detail3Content" TEXT,
    "detail4Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail4Title" TEXT,
    "detail4Content" TEXT,
    "detail5Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail5Title" TEXT,
    "detail5Content" TEXT,
    "detail6Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail6Title" TEXT,
    "detail6Content" TEXT,
    "detail7Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail7Title" TEXT,
    "detail7Content" TEXT,
    "detail8Flag" BOOLEAN NOT NULL DEFAULT false,
    "detail8Title" TEXT,
    "detail8Content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeldQualification" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "qualificationId" INTEGER NOT NULL,
    "acquiredDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeldQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '受講者',
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "hireDate" TIMESTAMP(3),
    "assignedDate" TIMESTAMP(3),
    "passwordHash" TEXT,
    "departmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamApplication" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER,
    "applicantId" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT '申請中',
    "approvedAt" TIMESTAMP(3),
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "granted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'user',
    "recipientId" INTEGER,
    "locationId" INTEGER,
    "excludeId" INTEGER,
    "audience" TEXT NOT NULL DEFAULT 'home',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "actorName" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ItemRequiredQuals" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ItemRequiredQuals_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EmployeeCourses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EmployeeCourses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvalStamp_employeeId_itemId_kind_idx_key" ON "EvalStamp"("employeeId", "itemId", "kind", "idx");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureGrade_employeeId_itemId_idx_stepIndex_pointIndex_key" ON "ProcedureGrade"("employeeId", "itemId", "idx", "stepIndex", "pointIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureEval_employeeId_itemId_idx_key" ON "ProcedureEval"("employeeId", "itemId", "idx");

-- CreateIndex
CREATE UNIQUE INDEX "WaitingOrder_itemId_employeeId_key" ON "WaitingOrder"("itemId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "HeldQualification_employeeId_qualificationId_key" ON "HeldQualification"("employeeId", "qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_employeeId_key" ON "Permission"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_notificationId_employeeId_key" ON "NotificationRead"("notificationId", "employeeId");

-- CreateIndex
CREATE INDEX "_ItemRequiredQuals_B_index" ON "_ItemRequiredQuals"("B");

-- CreateIndex
CREATE INDEX "_EmployeeCourses_B_index" ON "_EmployeeCourses"("B");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSection" ADD CONSTRAINT "TrainingSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrainingSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingItem" ADD CONSTRAINT "TrainingItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrainingSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalStamp" ADD CONSTRAINT "EvalStamp_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalStamp" ADD CONSTRAINT "EvalStamp_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureGrade" ADD CONSTRAINT "ProcedureGrade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureGrade" ADD CONSTRAINT "ProcedureGrade_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureEval" ADD CONSTRAINT "ProcedureEval_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureEval" ADD CONSTRAINT "ProcedureEval_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingOrder" ADD CONSTRAINT "WaitingOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingOrder" ADD CONSTRAINT "WaitingOrder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingMaterial" ADD CONSTRAINT "TrainingMaterial_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TrainingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeldQualification" ADD CONSTRAINT "HeldQualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeldQualification" ADD CONSTRAINT "HeldQualification_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamApplication" ADD CONSTRAINT "ExamApplication_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrainingSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamApplication" ADD CONSTRAINT "ExamApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemRequiredQuals" ADD CONSTRAINT "_ItemRequiredQuals_A_fkey" FOREIGN KEY ("A") REFERENCES "Qualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemRequiredQuals" ADD CONSTRAINT "_ItemRequiredQuals_B_fkey" FOREIGN KEY ("B") REFERENCES "TrainingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeCourses" ADD CONSTRAINT "_EmployeeCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeCourses" ADD CONSTRAINT "_EmployeeCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

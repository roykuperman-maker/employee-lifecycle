-- CreateTable
CREATE TABLE "ExitProcess" (
    "id" TEXT NOT NULL,
    "quickbaseRecordId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT,
    "jobTitle" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "terminationDate" TIMESTAMP(3),
    "exitType" TEXT,
    "exitProcessStatus" TEXT,
    "managerTabStatus" TEXT,
    "itTabStatus" TEXT,
    "financeTabStatus" TEXT,
    "payrollTabStatus" TEXT,
    "relocationTabStatus" TEXT,
    "benefitsTabStatus" TEXT,
    "securityTabStatus" TEXT,
    "hrTabStatus" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExitProcess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExitProcess_quickbaseRecordId_key" ON "ExitProcess"("quickbaseRecordId");

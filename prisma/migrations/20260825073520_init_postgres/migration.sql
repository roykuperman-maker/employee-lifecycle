-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "intuitEmail" TEXT,
    "phoneNumber" TEXT,
    "employeeType" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "employmentStartDate" TIMESTAMP(3),
    "employmentEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_START',
    "businessUnitDirectorApproved" BOOLEAN NOT NULL DEFAULT false,
    "hardwareReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "computerType" TEXT,
    "model" TEXT,
    "assetTag" TEXT NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "refreshEligibleDate" TIMESTAMP(3),
    "refreshStatus" TEXT NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "refreshNotifiedAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileDevice" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "model" TEXT,
    "assetTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "assignedDate" TIMESTAMP(3),
    "refreshEligibleDate" TIMESTAMP(3),
    "refreshStatus" TEXT NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "refreshNotifiedAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineForm" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "phoneNumber" TEXT,
    "sentToEmployeeAt" TIMESTAMP(3),
    "employeeCompletedAt" TIMESTAMP(3),
    "sentToPartnerAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "ccAddresses" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "employeeId" TEXT,
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineForm" ADD CONSTRAINT "LineForm_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

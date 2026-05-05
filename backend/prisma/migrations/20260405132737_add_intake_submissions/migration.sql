-- CreateTable
CREATE TABLE "intake_submissions" (
    "id" SERIAL NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "interviewedBy" TEXT,
    "leadId" INTEGER,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "facilities" INTEGER NOT NULL DEFAULT 1,
    "employees" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "certifications" TEXT[],
    "gfsiBenchmarked" TEXT,
    "lastAuditDate" TEXT,
    "biggestChallenge" TEXT,
    "modulesOfInterest" TEXT[],
    "timeline" TEXT,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "intake_submissions_pkey" PRIMARY KEY ("id")
);

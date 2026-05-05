-- CreateTable
CREATE TABLE "mes_interviews" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "module" TEXT,
    "responses" JSONB NOT NULL,
    "submittedBy" TEXT,
    "leadId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mes_interviews_pkey" PRIMARY KEY ("id")
);

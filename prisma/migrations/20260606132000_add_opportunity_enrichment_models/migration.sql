-- CreateTable
CREATE TABLE "OpportunityRankSnapshot" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "campaignId" TEXT,
    "scoringVersion" TEXT NOT NULL,
    "scoreTotal" DOUBLE PRECISION NOT NULL,
    "rankGlobal" INTEGER,
    "rankCampaign" INTEGER,
    "driversJson" JSONB,
    "blockersJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityRankSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationTask" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "resultJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanySignal" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "relationship" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "payloadJson" JSONB,
    "observedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactSignal" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "companySignalId" TEXT,
    "name" TEXT,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "sourcePolicy" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutreachActivity" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityRankSnapshot_opportunityId_idx" ON "OpportunityRankSnapshot"("opportunityId");
CREATE INDEX "OpportunityRankSnapshot_campaignId_idx" ON "OpportunityRankSnapshot"("campaignId");
CREATE INDEX "VerificationTask_opportunityId_idx" ON "VerificationTask"("opportunityId");
CREATE INDEX "VerificationTask_status_idx" ON "VerificationTask"("status");
CREATE INDEX "CompanySignal_opportunityId_idx" ON "CompanySignal"("opportunityId");
CREATE INDEX "ContactSignal_opportunityId_idx" ON "ContactSignal"("opportunityId");
CREATE INDEX "ContactSignal_companySignalId_idx" ON "ContactSignal"("companySignalId");
CREATE INDEX "OutreachActivity_opportunityId_idx" ON "OutreachActivity"("opportunityId");

-- AddForeignKey
ALTER TABLE "OpportunityRankSnapshot" ADD CONSTRAINT "OpportunityRankSnapshot_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityRankSnapshot" ADD CONSTRAINT "OpportunityRankSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ScanCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerificationTask" ADD CONSTRAINT "VerificationTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySignal" ADD CONSTRAINT "CompanySignal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactSignal" ADD CONSTRAINT "ContactSignal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactSignal" ADD CONSTRAINT "ContactSignal_companySignalId_fkey" FOREIGN KEY ("companySignalId") REFERENCES "CompanySignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OutreachActivity" ADD CONSTRAINT "OutreachActivity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

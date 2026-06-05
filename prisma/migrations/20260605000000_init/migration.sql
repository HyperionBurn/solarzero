-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "osmId" TEXT,
    "osmType" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "roofAreaM2" DOUBLE PRECISION,
    "buildingType" TEXT,
    "heightMeters" DOUBLE PRECISION,
    "hasSolar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'unreviewed',
    "scoreTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreBand" TEXT NOT NULL DEFAULT 'D',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextAction" TEXT NOT NULL DEFAULT 'ASSESS',
    "reasonsJson" JSONB,
    "risksJson" JSONB,
    "lastScoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityScore" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "roofFitScore" DOUBLE PRECISION NOT NULL,
    "economicsScore" DOUBLE PRECISION NOT NULL,
    "buildingTypeScore" DOUBLE PRECISION NOT NULL,
    "unsolarizedScore" DOUBLE PRECISION NOT NULL,
    "dataCompletenessScore" DOUBLE PRECISION NOT NULL,
    "regulatoryScore" DOUBLE PRECISION NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "reasonsJson" JSONB,
    "risksJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarizationEvidence" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "observedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarizationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationRun" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "buildingsFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesCreated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InvestigationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationRunBuilding" (
    "id" TEXT NOT NULL,
    "investigationRunId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationRunBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityNote" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL DEFAULT 'HYBRID',
    "ghiAnnual" DOUBLE PRECISION NOT NULL,
    "systemSizeKwp" DOUBLE PRECISION NOT NULL,
    "panelCount" INTEGER NOT NULL,
    "annualProduction" DOUBLE PRECISION NOT NULL,
    "totalCostAed" DOUBLE PRECISION NOT NULL,
    "annualSavingsAed" DOUBLE PRECISION NOT NULL,
    "paybackYears" DOUBLE PRECISION NOT NULL,
    "npv25yrAed" DOUBLE PRECISION NOT NULL,
    "co2OffsetTons" DOUBLE PRECISION NOT NULL,
    "dewaTariffAed" DOUBLE PRECISION NOT NULL DEFAULT 0.32,
    "rawResponseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_lat_lng_idx" ON "Building"("lat", "lng");

-- CreateIndex
CREATE INDEX "Building_buildingType_idx" ON "Building"("buildingType");

-- CreateIndex
CREATE INDEX "Building_osmId_idx" ON "Building"("osmId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_buildingId_key" ON "Opportunity"("buildingId");

-- CreateIndex
CREATE INDEX "Opportunity_scoreBand_scoreTotal_idx" ON "Opportunity"("scoreBand", "scoreTotal");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_nextAction_idx" ON "Opportunity"("nextAction");

-- CreateIndex
CREATE INDEX "OpportunityScore_opportunityId_createdAt_idx" ON "OpportunityScore"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "SolarizationEvidence_opportunityId_idx" ON "SolarizationEvidence"("opportunityId");

-- CreateIndex
CREATE INDEX "SolarizationEvidence_status_confidence_idx" ON "SolarizationEvidence"("status", "confidence");

-- CreateIndex
CREATE INDEX "InvestigationRun_status_createdAt_idx" ON "InvestigationRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InvestigationRunBuilding_investigationRunId_idx" ON "InvestigationRunBuilding"("investigationRunId");

-- CreateIndex
CREATE INDEX "InvestigationRunBuilding_buildingId_idx" ON "InvestigationRunBuilding"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_buildingId_key" ON "Assessment"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityScore" ADD CONSTRAINT "OpportunityScore_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarizationEvidence" ADD CONSTRAINT "SolarizationEvidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationRunBuilding" ADD CONSTRAINT "InvestigationRunBuilding_investigationRunId_fkey" FOREIGN KEY ("investigationRunId") REFERENCES "InvestigationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityNote" ADD CONSTRAINT "OpportunityNote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;


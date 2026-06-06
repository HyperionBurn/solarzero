-- CreateTable
CREATE TABLE "ScanCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emirate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "boundsJson" JSONB,
    "filtersJson" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScanCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanTile" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "boundsJson" JSONB NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "buildingsFound" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanTile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryCandidate" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "scanTileId" TEXT,
    "buildingId" TEXT,
    "opportunityId" TEXT,
    "sourceId" TEXT NOT NULL,
    "sourceKey" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "geometryJson" JSONB,
    "payloadJson" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanTile_campaignId_idx" ON "ScanTile"("campaignId");

-- CreateIndex
CREATE INDEX "ScanTile_status_idx" ON "ScanTile"("status");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_campaignId_idx" ON "DiscoveryCandidate"("campaignId");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_scanTileId_idx" ON "DiscoveryCandidate"("scanTileId");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_buildingId_idx" ON "DiscoveryCandidate"("buildingId");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_opportunityId_idx" ON "DiscoveryCandidate"("opportunityId");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_sourceId_sourceKey_idx" ON "DiscoveryCandidate"("sourceId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryCandidate_sourceId_sourceKey_key" ON "DiscoveryCandidate"("sourceId", "sourceKey");

-- AddForeignKey
ALTER TABLE "ScanTile" ADD CONSTRAINT "ScanTile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ScanCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ScanCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_scanTileId_fkey" FOREIGN KEY ("scanTileId") REFERENCES "ScanTile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

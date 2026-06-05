-- CreateTable
CREATE TABLE "DataConnector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUrl" TEXT,
    "license" TEXT,
    "accessModel" TEXT NOT NULL DEFAULT 'unknown',
    "refreshCadence" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorRun" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputJson" JSONB,
    "outputCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectorRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorSignal" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "buildingId" TEXT,
    "opportunityId" TEXT,
    "signalType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "license" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectorRun_connectorId_startedAt_idx" ON "ConnectorRun"("connectorId", "startedAt");

-- CreateIndex
CREATE INDEX "ConnectorRun_status_idx" ON "ConnectorRun"("status");

-- CreateIndex
CREATE INDEX "ConnectorSignal_buildingId_idx" ON "ConnectorSignal"("buildingId");

-- CreateIndex
CREATE INDEX "ConnectorSignal_opportunityId_idx" ON "ConnectorSignal"("opportunityId");

-- CreateIndex
CREATE INDEX "ConnectorSignal_entityType_entityId_idx" ON "ConnectorSignal"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ConnectorSignal_signalType_idx" ON "ConnectorSignal"("signalType");

-- CreateIndex
CREATE INDEX "ConnectorSignal_connectorId_fetchedAt_idx" ON "ConnectorSignal"("connectorId", "fetchedAt");

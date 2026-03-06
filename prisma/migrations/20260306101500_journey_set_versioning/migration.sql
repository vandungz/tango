-- Journey set versioning for curated/rebuildable Journey mode

-- CreateTable
CREATE TABLE "JourneySet" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "totalLevels" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "JourneySet_pkey" PRIMARY KEY ("id")
);

-- AddColumn (nullable first for data migration)
ALTER TABLE "JourneyLevel" ADD COLUMN "setId" TEXT;

-- Seed legacy set and assign existing levels into it
WITH inserted AS (
    INSERT INTO "JourneySet" ("id", "key", "label", "description", "totalLevels", "isActive", "createdAt", "updatedAt")
    VALUES (
        'legacy-journey-set-v1',
        'legacy-v1',
        'Legacy Journey Set',
        'Migrated from pre-versioned Journey levels',
        COALESCE((SELECT COUNT(*) FROM "JourneyLevel"), 0),
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT ("key") DO UPDATE
    SET "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id"
)
UPDATE "JourneyLevel"
SET "setId" = (SELECT "id" FROM inserted LIMIT 1)
WHERE "setId" IS NULL;

-- Finalize setId as required
ALTER TABLE "JourneyLevel" ALTER COLUMN "setId" SET NOT NULL;

-- Remove old unique indexes incompatible with versioning
DROP INDEX IF EXISTS "JourneyLevel_order_key";
DROP INDEX IF EXISTS "JourneyLevel_puzzleId_key";

-- CreateIndex
CREATE UNIQUE INDEX "JourneySet_key_key" ON "JourneySet"("key");
CREATE INDEX "JourneySet_isActive_idx" ON "JourneySet"("isActive");
CREATE UNIQUE INDEX "JourneyLevel_setId_order_key" ON "JourneyLevel"("setId", "order");
CREATE UNIQUE INDEX "JourneyLevel_setId_puzzleId_key" ON "JourneyLevel"("setId", "puzzleId");
CREATE INDEX "JourneyLevel_setId_order_idx" ON "JourneyLevel"("setId", "order");

-- AddForeignKey
ALTER TABLE "JourneyLevel"
ADD CONSTRAINT "JourneyLevel_setId_fkey"
FOREIGN KEY ("setId") REFERENCES "JourneySet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

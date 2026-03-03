-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" TEXT,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "clues" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "maxRuleDifficulty" INTEGER NOT NULL DEFAULT 0,
    "rulesUsed" TEXT NOT NULL DEFAULT '[]',
    "clueCount" INTEGER NOT NULL DEFAULT 0,
    "givensCount" INTEGER NOT NULL DEFAULT 0,
    "baseRowPatternCount" INTEGER NOT NULL DEFAULT 0,
    "generationVersion" TEXT NOT NULL DEFAULT 'pipeline-v1',
    "solverVersion" TEXT NOT NULL DEFAULT 'rule-engine-v1',
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayedPuzzle" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayedPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPuzzle" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 6,
    "proMode" BOOLEAN NOT NULL DEFAULT false,
    "puzzleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "dailyPuzzleId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyLevel" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "levelId" TEXT NOT NULL,
    "timeSeconds" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_identifier_type_idx" ON "VerificationToken"("identifier", "type");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_type_key" ON "VerificationToken"("identifier", "token", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_hash_key" ON "Puzzle"("hash");

-- CreateIndex
CREATE INDEX "Puzzle_size_label_idx" ON "Puzzle"("size", "label");

-- CreateIndex
CREATE INDEX "PlayedPuzzle_sessionId_idx" ON "PlayedPuzzle"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayedPuzzle_sessionId_puzzleId_key" ON "PlayedPuzzle"("sessionId", "puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPuzzle_puzzleId_key" ON "DailyPuzzle"("puzzleId");

-- CreateIndex
CREATE INDEX "DailyPuzzle_date_proMode_idx" ON "DailyPuzzle"("date", "proMode");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPuzzle_date_size_proMode_key" ON "DailyPuzzle"("date", "size", "proMode");

-- CreateIndex
CREATE INDEX "DailyResult_userId_idx" ON "DailyResult"("userId");

-- CreateIndex
CREATE INDEX "DailyResult_sessionId_idx" ON "DailyResult"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyResult_sessionId_dailyPuzzleId_key" ON "DailyResult"("sessionId", "dailyPuzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyResult_userId_dailyPuzzleId_key" ON "DailyResult"("userId", "dailyPuzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyLevel_order_key" ON "JourneyLevel"("order");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyLevel_puzzleId_key" ON "JourneyLevel"("puzzleId");

-- CreateIndex
CREATE INDEX "JourneyResult_userId_idx" ON "JourneyResult"("userId");

-- CreateIndex
CREATE INDEX "JourneyResult_sessionId_idx" ON "JourneyResult"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyResult_sessionId_levelId_key" ON "JourneyResult"("sessionId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyResult_userId_levelId_key" ON "JourneyResult"("userId", "levelId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayedPuzzle" ADD CONSTRAINT "PlayedPuzzle_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPuzzle" ADD CONSTRAINT "DailyPuzzle_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_dailyPuzzleId_fkey" FOREIGN KEY ("dailyPuzzleId") REFERENCES "DailyPuzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyLevel" ADD CONSTRAINT "JourneyLevel_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyResult" ADD CONSTRAINT "JourneyResult_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "JourneyLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyResult" ADD CONSTRAINT "JourneyResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReadingSpeedTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "textWordCount" INTEGER NOT NULL,
    "secondsSpent" INTEGER NOT NULL,
    "wordsPerMin" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingSpeedTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Book" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "estimatedPages" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReadingPlan" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "monHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tueHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thuHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "friHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sunHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedEndDate" TIMESTAMP(3),
    "requiredHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "public"."User"("login");

-- CreateIndex
CREATE INDEX "ReadingSpeedTest_userId_createdAt_idx" ON "public"."ReadingSpeedTest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Book_userId_createdAt_idx" ON "public"."Book"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingPlan_bookId_key" ON "public"."ReadingPlan"("bookId");

-- AddForeignKey
ALTER TABLE "public"."ReadingSpeedTest" ADD CONSTRAINT "ReadingSpeedTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReadingPlan" ADD CONSTRAINT "ReadingPlan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;


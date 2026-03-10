-- CreateTable
CREATE TABLE "ReadingList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingListBook" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingListBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingList_userId_createdAt_idx" ON "ReadingList"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingListBook_listId_bookId_key" ON "ReadingListBook"("listId", "bookId");

-- CreateIndex
CREATE INDEX "ReadingListBook_listId_position_idx" ON "ReadingListBook"("listId", "position");

-- CreateIndex
CREATE INDEX "ReadingListBook_bookId_idx" ON "ReadingListBook"("bookId");

-- AddForeignKey
ALTER TABLE "ReadingList" ADD CONSTRAINT "ReadingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingListBook" ADD CONSTRAINT "ReadingListBook_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ReadingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingListBook" ADD CONSTRAINT "ReadingListBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

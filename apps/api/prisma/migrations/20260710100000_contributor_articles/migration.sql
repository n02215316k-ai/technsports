ALTER TABLE "Article" ADD COLUMN "authorUserId" TEXT;
ALTER TABLE "Article" ADD COLUMN "matchId" TEXT;
ALTER TABLE "Article" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'EDITORIAL';
ALTER TABLE "Article" ADD COLUMN "autoApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Article" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN "moderationNote" TEXT;
ALTER TABLE "Article" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "ArticleComment" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleReaction" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX "Article_matchId_status_idx" ON "Article"("matchId", "status");
CREATE INDEX "Article_authorUserId_status_idx" ON "Article"("authorUserId", "status");
CREATE INDEX "ArticleComment_articleId_createdAt_idx" ON "ArticleComment"("articleId", "createdAt");
CREATE INDEX "ArticleComment_userId_createdAt_idx" ON "ArticleComment"("userId", "createdAt");
CREATE UNIQUE INDEX "ArticleReaction_articleId_userId_key" ON "ArticleReaction"("articleId", "userId");
CREATE INDEX "ArticleReaction_articleId_value_idx" ON "ArticleReaction"("articleId", "value");

ALTER TABLE "Article" ADD CONSTRAINT "Article_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

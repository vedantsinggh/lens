-- CreateTable
CREATE TABLE "credit_policies" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_policies_policy_id_key" ON "credit_policies"("policy_id");

-- CreateIndex
CREATE INDEX "credit_policies_status_audience_idx" ON "credit_policies"("status", "audience");

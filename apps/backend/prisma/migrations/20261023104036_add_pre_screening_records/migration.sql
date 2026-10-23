-- CreateTable
CREATE TABLE "pre_screening_records" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "applicant_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "workflow_status" TEXT NOT NULL DEFAULT 'pending',
    "principal" DOUBLE PRECISION NOT NULL,
    "annual_rate" DOUBLE PRECISION NOT NULL,
    "term_months" INTEGER NOT NULL,
    "gross_income" DOUBLE PRECISION NOT NULL,
    "monthly_debt" DOUBLE PRECISION NOT NULL,
    "monthly_emi" DOUBLE PRECISION NOT NULL,
    "total_repayment" DOUBLE PRECISION NOT NULL,
    "total_interest" DOUBLE PRECISION NOT NULL,
    "dti_percentage" DOUBLE PRECISION NOT NULL,
    "ltv_percentage" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "missing_docs" TEXT[],
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_screening_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pre_screening_records_application_id_idx" ON "pre_screening_records"("application_id");

-- CreateIndex
CREATE INDEX "pre_screening_records_category_idx" ON "pre_screening_records"("category");

-- CreateIndex
CREATE INDEX "pre_screening_records_workflow_status_idx" ON "pre_screening_records"("workflow_status");

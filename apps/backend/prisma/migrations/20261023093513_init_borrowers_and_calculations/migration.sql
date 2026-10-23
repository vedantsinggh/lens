-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "borrowers" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "annual_income" DOUBLE PRECISION NOT NULL,
    "monthly_debt" DOUBLE PRECISION NOT NULL,
    "credit_score" INTEGER NOT NULL,
    "employment_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_calculations" (
    "id" TEXT NOT NULL,
    "borrower_id" TEXT,
    "principal" DOUBLE PRECISION NOT NULL,
    "annual_rate" DOUBLE PRECISION NOT NULL,
    "term_months" INTEGER NOT NULL,
    "monthly_emi" DOUBLE PRECISION NOT NULL,
    "total_repayment" DOUBLE PRECISION NOT NULL,
    "total_interest" DOUBLE PRECISION NOT NULL,
    "dti_ratio" DOUBLE PRECISION,
    "ltv_ratio" DOUBLE PRECISION,
    "scenario_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "borrowers_email_key" ON "borrowers"("email");

-- AddForeignKey
ALTER TABLE "loan_calculations" ADD CONSTRAINT "loan_calculations_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "borrowers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

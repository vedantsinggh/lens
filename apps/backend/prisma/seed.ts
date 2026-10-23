import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding synthetic borrower profiles and demo calculations...');

  // Clean existing records in demo database
  await prisma.loanCalculation.deleteMany();
  await prisma.borrower.deleteMany();

  // 1. Prime Conforming Borrower (Jane Doe - High Income, Prime Credit)
  const primeBorrower = await prisma.borrower.create({
    data: {
      fullName: 'Jane Doe (Prime)',
      email: 'jane.doe.synthetic@loanlens.example.com',
      annualIncome: 150000,
      monthlyDebt: 650,
      creditScore: 785,
      employmentStatus: 'Employed - Full Time'
    }
  });

  // 2. Moderate Risk Borrower (Alex Rivera - Moderate DTI)
  const moderateBorrower = await prisma.borrower.create({
    data: {
      fullName: 'Alex Rivera (Moderate DTI)',
      email: 'alex.rivera.synthetic@loanlens.example.com',
      annualIncome: 57600,
      monthlyDebt: 1150,
      creditScore: 672,
      employmentStatus: 'Self-Employed'
    }
  });

  // 3. Promotional Zero-Interest Borrower (Marcus Chen - Promo Financing)
  const promoBorrower = await prisma.borrower.create({
    data: {
      fullName: 'Marcus Chen (Promo 0% APR)',
      email: 'marcus.chen.synthetic@loanlens.example.com',
      annualIncome: 78000,
      monthlyDebt: 350,
      creditScore: 738,
      employmentStatus: 'Employed - Full Time'
    }
  });

  // Insert corresponding initial calculated scenarios
  await prisma.loanCalculation.createMany({
    data: [
      {
        borrowerId: primeBorrower.id,
        principal: 400000,
        annualRate: 6.5,
        termMonths: 360,
        monthlyEMI: 2528.27,
        totalRepayment: 910177.2,
        totalInterest: 510177.2,
        dtiRatio: 25.43,
        ltvRatio: 80.0,
        scenarioName: 'Prime Conforming 30Y Fixed'
      },
      {
        borrowerId: moderateBorrower.id,
        principal: 38000,
        annualRate: 7.25,
        termMonths: 60,
        monthlyEMI: 756.98,
        totalRepayment: 45418.8,
        totalInterest: 7418.8,
        dtiRatio: 39.73,
        ltvRatio: 90.48,
        scenarioName: 'Auto Loan 5Y Moderate'
      },
      {
        borrowerId: promoBorrower.id,
        principal: 12000,
        annualRate: 0.0,
        termMonths: 24,
        monthlyEMI: 500.0,
        totalRepayment: 12000.0,
        totalInterest: 0.0,
        dtiRatio: 13.08,
        ltvRatio: 80.0,
        scenarioName: 'Promotional 24M Zero-Interest'
      }
    ]
  });

  const borrowerCount = await prisma.borrower.count();
  const calculationCount = await prisma.loanCalculation.count();

  console.log(`[Seed] Successfully seeded ${borrowerCount} synthetic borrowers and ${calculationCount} initial calculations.`);
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { Plan, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  }),
});

const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, 12);

const subscriptionPlans = [
  {
    code: Plan.FREE,
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    analysesLimit: 10,
    highlighted: false,
    features: ['10 analyses per month', 'Basic SEO audit', 'Performance snapshot', 'Email support'],
  },
  {
    code: Plan.STARTER,
    name: 'Starter',
    priceMonthly: 19,
    priceYearly: 190,
    analysesLimit: 50,
    highlighted: false,
    features: ['50 analyses per month', 'Full SEO reports', 'Saved websites', 'Report exports'],
  },
  {
    code: Plan.PRO,
    name: 'Pro',
    priceMonthly: 49,
    priceYearly: 490,
    analysesLimit: 200,
    highlighted: true,
    features: ['200 analyses per month', 'AI recommendations', 'Report comparisons', 'Priority support'],
  },
  {
    code: Plan.ENTERPRISE,
    name: 'Enterprise',
    priceMonthly: 199,
    priceYearly: 1990,
    analysesLimit: 2000,
    highlighted: false,
    features: ['2,000 analyses per month', 'Team workflows', 'Custom exports', 'Dedicated support'],
  },
];

const featureFlags = [
  {
    key: 'ai_recommendations',
    name: 'AI Recommendations',
    description: 'Show AI-generated SEO recommendations in reports.',
    enabled: true,
  },
  {
    key: 'report_exports',
    name: 'Report Exports',
    description: 'Allow PDF, Excel, and JSON report exports.',
    enabled: true,
  },
  {
    key: 'google_oauth',
    name: 'Google OAuth',
    description: 'Enable Google sign-in when OAuth credentials are configured.',
    enabled: true,
  },
  {
    key: 'maintenance_banner',
    name: 'Maintenance Banner',
    description: 'Display a maintenance banner in the web app.',
    enabled: false,
  },
];

const systemSettings = [
  { key: 'site_name', value: 'SEO Vision AI' },
  { key: 'support_email', value: 'support@seovision.ai' },
  { key: 'default_theme', value: 'system' },
  { key: 'allow_registration', value: 'true' },
  { key: 'maintenance_message', value: '' },
];

const main = async (): Promise<void> => {
  const [adminPasswordHash, demoPasswordHash] = await Promise.all([hashPassword('Admin123!'), hashPassword('Demo123!')]);

  await prisma.user.upsert({
    where: { email: 'admin@seovision.ai' },
    update: {
      name: 'SEO Vision Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      plan: Plan.ENTERPRISE,
      emailVerified: true,
      apiCallsLimit: 2000,
    },
    create: {
      email: 'admin@seovision.ai',
      name: 'SEO Vision Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      plan: Plan.ENTERPRISE,
      emailVerified: true,
      apiCallsLimit: 2000,
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@seovision.ai' },
    update: {
      name: 'Demo User',
      passwordHash: demoPasswordHash,
      role: Role.USER,
      plan: Plan.PRO,
      emailVerified: true,
      apiCallsLimit: 200,
    },
    create: {
      email: 'demo@seovision.ai',
      name: 'Demo User',
      passwordHash: demoPasswordHash,
      role: Role.USER,
      plan: Plan.PRO,
      emailVerified: true,
      apiCallsLimit: 200,
    },
  });

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        analysesLimit: plan.analysesLimit,
        features: JSON.stringify(plan.features),
        highlighted: plan.highlighted,
        active: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        analysesLimit: plan.analysesLimit,
        features: JSON.stringify(plan.features),
        highlighted: plan.highlighted,
        active: true,
      },
    });
  }

  for (const feature of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: feature.key },
      update: {
        name: feature.name,
        description: feature.description,
        enabled: feature.enabled,
      },
      create: feature,
    });
  }

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Seed data created successfully');
};

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

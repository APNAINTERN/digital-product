import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

const PLAN_FEATURES = {
  FREE: [
    '10 website analyses / month',
    'Basic SEO score report',
    'Technical SEO checklist',
    '7-day report history',
  ],
  STARTER: [
    '50 website analyses / month',
    'Full SEO + content analysis',
    'Competitor snapshots',
    'PDF export',
    '30-day report history',
  ],
  PRO: [
    '200 website analyses / month',
    'AI growth advisor + action plans',
    'Keyword & traffic estimates',
    'PDF + Excel export',
    'Compare reports',
    'Priority support',
  ],
  ENTERPRISE: [
    '2000 website analyses / month',
    'Everything in Pro',
    'Admin controls & API usage analytics',
    'Custom limits',
    'SSO-ready profile settings',
    'Dedicated onboarding',
  ],
} as const;

let seeding: Promise<void> | null = null;

export const ensureSeedData = async (): Promise<void> => {
  if (seeding) {
    await seeding;
    return;
  }

  seeding = (async () => {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return;
    }

    console.info('No users found — seeding demo data…');

    const passwordHash = await bcrypt.hash('Demo123!', 10);
    const adminHash = await bcrypt.hash('Admin123!', 10);

    await prisma.subscriptionPlan.createMany({
      data: [
        {
          code: 'FREE',
          name: 'Free',
          priceMonthly: 0,
          priceYearly: 0,
          analysesLimit: 10,
          features: JSON.stringify(PLAN_FEATURES.FREE),
          highlighted: false,
        },
        {
          code: 'STARTER',
          name: 'Starter',
          priceMonthly: 29,
          priceYearly: 290,
          analysesLimit: 50,
          features: JSON.stringify(PLAN_FEATURES.STARTER),
          highlighted: false,
        },
        {
          code: 'PRO',
          name: 'Pro',
          priceMonthly: 79,
          priceYearly: 790,
          analysesLimit: 200,
          features: JSON.stringify(PLAN_FEATURES.PRO),
          highlighted: true,
        },
        {
          code: 'ENTERPRISE',
          name: 'Enterprise',
          priceMonthly: 249,
          priceYearly: 2490,
          analysesLimit: 2000,
          features: JSON.stringify(PLAN_FEATURES.ENTERPRISE),
          highlighted: false,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.featureFlag.createMany({
      data: [
        {
          key: 'ai_advisor',
          name: 'AI Growth Advisor',
          description: 'Generate AI business growth recommendations',
          enabled: true,
        },
        {
          key: 'competitor_intel',
          name: 'Competitor Intel',
          description: 'Show competitor comparison estimates',
          enabled: true,
        },
        {
          key: 'report_exports',
          name: 'Report Exports',
          description: 'Allow PDF/Excel/JSON downloads',
          enabled: true,
        },
        {
          key: 'google_oauth',
          name: 'Google OAuth',
          description: 'Enable Google login when credentials exist',
          enabled: false,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.systemSetting.createMany({
      data: [
        { key: 'app.name', value: 'SEO Vision AI' },
        { key: 'app.support_email', value: 'support@seovision.ai' },
        { key: 'analysis.default_timeout_ms', value: '20000' },
        { key: 'branding.tagline', value: 'Complete Website SEO Audit & Business Growth Platform' },
      ],
      skipDuplicates: true,
    });

    await prisma.user.upsert({
      where: { email: 'demo@seovision.ai' },
      update: {
        passwordHash,
        name: 'Demo User',
        role: 'USER',
        plan: 'PRO',
        emailVerified: true,
        apiCallsLimit: 200,
        apiCallsUsed: 0,
      },
      create: {
        email: 'demo@seovision.ai',
        passwordHash,
        name: 'Demo User',
        role: 'USER',
        plan: 'PRO',
        emailVerified: true,
        apiCallsLimit: 200,
        apiCallsUsed: 0,
        theme: 'system',
      },
    });

    await prisma.user.upsert({
      where: { email: 'admin@seovision.ai' },
      update: {
        passwordHash: adminHash,
        name: 'SEO Vision Admin',
        role: 'ADMIN',
        plan: 'ENTERPRISE',
        emailVerified: true,
        apiCallsLimit: 2000,
        apiCallsUsed: 0,
      },
      create: {
        email: 'admin@seovision.ai',
        passwordHash: adminHash,
        name: 'SEO Vision Admin',
        role: 'ADMIN',
        plan: 'ENTERPRISE',
        emailVerified: true,
        apiCallsLimit: 2000,
        apiCallsUsed: 0,
        theme: 'system',
      },
    });

    console.info('Seed data ready (demo@seovision.ai / Demo123!)');
  })();

  try {
    await seeding;
  } finally {
    seeding = null;
  }
};

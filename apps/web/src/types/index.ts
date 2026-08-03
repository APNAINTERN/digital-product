export type Role = 'USER' | 'ADMIN';
export type UserRole = Role;

export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export type PlanCode = Plan;

export type ReportStatus = 'QUEUED' | 'CRAWLING' | 'ANALYZING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export type Confidence = 'VERIFIED' | 'ESTIMATED' | 'AI_GENERATED';
export type DataConfidence = Confidence;

export type ThemePreference = 'light' | 'dark' | 'system';

export type User = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: Role;
  plan: Plan;
  emailVerified: boolean;
  apiCallsUsed: number;
  apiCallsLimit: number;
  theme: ThemePreference | string;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ChartPoint = {
  label: string;
  value: number;
  date?: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type ConfidenceValue<T = string | number | boolean | null> = {
  value: T;
  confidence?: Confidence;
  source?: string;
  note?: string;
};

export type FlexibleRecord = Record<string, unknown>;

export type ReportSummary = {
  id: string;
  url: string;
  domain: string;
  status: ReportStatus;
  progress: number;
  statusMessage?: string | null;
  errorMessage?: string | null;
  seoScore?: number | null;
  performanceScore?: number | null;
  healthScore?: number | null;
  summary?: string | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  user?: Pick<User, 'id' | 'email' | 'name'>;
};

export type Report = ReportSummary & {
  userId?: string;
  data?: FullAnalysisReport | unknown | null;
};

export type SavedWebsite = {
  id: string;
  userId?: string;
  url: string;
  domain: string;
  label?: string | null;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
};

export type ApiUsage = {
  id: string;
  userId?: string;
  endpoint: string;
  method: string;
  status: number;
  credits: number;
  meta?: unknown;
  createdAt: string;
  user?: Pick<User, 'id' | 'email' | 'name'>;
};

export type SubscriptionPlan = {
  id: string;
  code: Plan;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  analysesLimit: number;
  features: unknown;
  highlighted: boolean;
  active: boolean;
};

export type AdminStats = {
  usersCount: number;
  reportsCount: number;
  apiUsage: {
    requests: number;
    credits: number;
  };
  plansBreakdown?: Record<string, number>;
  usersByPlan?: Record<string, number>;
  reportsByStatus: Record<string, number>;
  openMessagesCount: number;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
};

export type SystemSetting = {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
};

export type BacklinkEstimate = {
  confidence?: Confidence;
  estimatedBacklinks?: number;
  referringDomains?: number;
  domainAuthority?: number;
  toxicBacklinkRisk?: 'low' | 'medium' | 'high';
  chart?: ChartPoint[];
  [key: string]: unknown;
};

export type TrafficEstimate = {
  confidence?: Confidence;
  estimatedMonthlyVisits?: number;
  estimatedOrganicTraffic?: number;
  engagementScore?: number;
  visitors?: {
    monthly?: number;
    dailyAverage?: number;
    weeklyAverage?: number;
    returningPercent?: number;
  };
  acquisition?: {
    organic?: number;
    paid?: number;
    direct?: number;
    referral?: number;
    social?: number;
    chart?: ChartPoint[];
  };
  engagement?: {
    bounceRate?: number;
    averageSessionDurationSeconds?: number;
    pagesPerSession?: number;
  };
  geography?: {
    topCountries?: ChartPoint[];
    topCities?: ChartPoint[];
  };
  devices?: {
    desktop?: number;
    mobile?: number;
    tablet?: number;
    chart?: ChartPoint[];
  };
  timing?: {
    peakHours?: ChartPoint[];
    peakDays?: ChartPoint[];
  };
  trends?: {
    monthlyVisitors?: Array<{ date: string; value: number }>;
    seasonal?: ChartPoint[];
  };
  channels?: ChartPoint[];
  trend?: ChartPoint[];
  [key: string]: unknown;
};

export type EstimatedRankingKeyword = {
  keyword: string;
  estimatedPosition?: number;
  estimatedMonthlyVolume?: number;
  difficulty?: number;
  intent?: 'informational' | 'commercial' | 'transactional' | 'local';
  confidence?: Confidence;
  [key: string]: unknown;
};

export type FullAnalysisReport = {
  [key: string]: unknown;
  seoScore?: number;
  performanceScore?: number;
  healthScore?: number;
  summary?: string;
  meta?: {
    generatedAt?: string;
    version?: string;
    disclaimer?: string;
    confidenceLegend?: Partial<Record<Confidence, string>>;
    [key: string]: unknown;
  };
  input?: {
    url?: string;
    normalizedUrl?: string;
    domain?: string;
    [key: string]: unknown;
  };
  crawl?: {
    url?: string;
    normalizedUrl?: string;
    domain?: string;
    title?: string;
    metaDescription?: string;
    headings?: FlexibleRecord;
    links?: FlexibleRecord;
    images?: FlexibleRecord;
    schemaOrg?: unknown[];
    contact?: {
      email?: string[];
      phone?: string[];
      socialLinks?: Record<string, string[]>;
      [key: string]: unknown;
    };
    pages?: unknown[];
    [key: string]: unknown;
  };
  business?: {
    businessName?: ConfidenceValue<string | null>;
    category?: ConfidenceValue<string | null>;
    phone?: ConfidenceValue<string | null>;
    address?: {
      formatted?: ConfidenceValue<string | null>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  seo?: {
    scores?: {
      overall?: number;
      technical?: number;
      content?: number;
      performance?: number;
      security?: number;
      accessibility?: number;
      [key: string]: number | undefined;
    };
    coreWebVitals?: {
      performanceScore?: number;
      lcp?: number | ConfidenceValue<number>;
      cls?: number | ConfidenceValue<number>;
      inp?: number | ConfidenceValue<number>;
      [key: string]: unknown;
    };
    issues?: Array<FlexibleRecord>;
    recommendations?: Array<string | FlexibleRecord>;
    keywordDensity?: {
      metrics?: Array<{
        keyword: string;
        count?: number;
        density?: number;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  traffic?: TrafficEstimate;
  competitors?: {
    confidence?: Confidence;
    directCompetitors?: Array<FlexibleRecord>;
    nicheKeywords?: string[];
    benchmark?: FlexibleRecord;
    [key: string]: unknown;
  };
  ai?: {
    confidence?: Confidence;
    executiveSummary?: string;
    opportunities?: Array<string | FlexibleRecord>;
    priorities?: Array<string | FlexibleRecord>;
    actionPlan?: Array<string | FlexibleRecord>;
    [key: string]: unknown;
  };
  backlinks?: BacklinkEstimate;
  localSeo?: {
    confidence?: Confidence;
    hasAddress?: boolean;
    hasPhone?: boolean;
    hasLocalBusinessSchema?: boolean;
    napConsistencyScore?: number;
    reviewOpportunity?: string;
    recommendations?: string[];
    [key: string]: unknown;
  };
  socialAnalysis?: {
    confidence?: Confidence;
    profiles?: Record<string, string[]>;
    connectedPlatforms?: number;
    estimatedFollowers?: ChartPoint[];
    recommendations?: string[];
    [key: string]: unknown;
  };
  keywordAnalysis?: {
    confidence?: Confidence;
    rankingKeywords?: EstimatedRankingKeyword[];
    contentGaps?: string[];
    primaryTopics?: string[];
    [key: string]: unknown;
  };
};

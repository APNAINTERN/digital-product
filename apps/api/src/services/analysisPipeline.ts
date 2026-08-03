import { prisma } from "../lib/prisma.js";
import { generateAiReport, type AiReport } from "./aiAdvisor.js";
import { detectBusiness, type BusinessDetection } from "./businessDetector.js";
import { findCompetitors, type CompetitorReport } from "./competitorFinder.js";
import {
  crawlWebsite,
  type CrawlResult,
  type DataConfidence,
  type SocialLinks,
} from "./crawler.js";
import { analyzeCrawl, type SeoAnalysis } from "./seoAnalyzer.js";
import { estimateTraffic, type ChartPoint, type TrafficEstimate } from "./trafficEstimator.js";

export type ProgressCallback = (progress: number, message: string) => void | Promise<void>;

export interface PipelineProgressUpdate {
  status?: "QUEUED" | "CRAWLING" | "ANALYZING" | "GENERATING" | "COMPLETED" | "FAILED";
  progress?: number;
  message?: string;
}

export interface PipelineOptions {
  reportId?: string;
  userId?: string;
  onProgress?: (progress: PipelineProgressUpdate) => void | Promise<void>;
}

type ProgressInput = ProgressCallback | PipelineOptions;

export interface BacklinkEstimate {
  confidence: DataConfidence;
  estimatedBacklinks: number;
  referringDomains: number;
  domainAuthority: number;
  toxicBacklinkRisk: "low" | "medium" | "high";
  chart: ChartPoint[];
}

export interface LocalSeoSection {
  confidence: DataConfidence;
  hasAddress: boolean;
  hasPhone: boolean;
  hasLocalBusinessSchema: boolean;
  napConsistencyScore: number;
  reviewOpportunity: string;
  recommendations: string[];
}

export interface SocialAnalysis {
  confidence: DataConfidence;
  profiles: SocialLinks;
  connectedPlatforms: number;
  estimatedFollowers: ChartPoint[];
  recommendations: string[];
}

export interface EstimatedRankingKeyword {
  keyword: string;
  estimatedPosition: number;
  estimatedMonthlyVolume: number;
  difficulty: number;
  intent: "informational" | "commercial" | "transactional" | "local";
  confidence: DataConfidence;
}

export interface KeywordAnalysisSection {
  confidence: DataConfidence;
  rankingKeywords: EstimatedRankingKeyword[];
  contentGaps: string[];
  primaryTopics: string[];
}

export interface CompleteAnalysisReport {
  [key: string]: unknown;
  meta: {
    generatedAt: string;
    version: string;
    disclaimer: string;
    confidenceLegend: Record<DataConfidence, string>;
  };
  input: {
    url: string;
    normalizedUrl: string;
    domain: string;
  };
  crawl: CrawlResult;
  business: BusinessDetection;
  seo: SeoAnalysis;
  traffic: TrafficEstimate;
  competitors: CompetitorReport;
  ai: AiReport;
  backlinks: BacklinkEstimate;
  localSeo: LocalSeoSection;
  socialAnalysis: SocialAnalysis;
  keywordAnalysis: KeywordAnalysisSection;
}

const hashString = (value: string): number => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return hash >>> 0;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const statusFromProgress = (value: number): "CRAWLING" | "ANALYZING" | "GENERATING" => {
  if (value < 30) return "CRAWLING";
  if (value < 78) return "ANALYZING";
  return "GENERATING";
};

const progress = async (
  callback: ProgressInput | undefined,
  value: number,
  message: string,
): Promise<void> => {
  if (typeof callback === "function") {
    await callback(value, message);
    return;
  }

  await callback?.onProgress?.({
    status: value >= 100 ? "COMPLETED" : statusFromProgress(value),
    progress: value,
    message,
  });
};

const buildBacklinkEstimate = (domain: string, seoScore: number): BacklinkEstimate => {
  const seed = hashString(domain);
  const domainAuthority = clamp(18 + (seed % 45) + seoScore * 0.18, 5, 92);
  const referringDomains = clamp(20 + (seed % 900) * (0.45 + seoScore / 130), 5, 8_000);
  const estimatedBacklinks = clamp(
    referringDomains * (4 + ((seed >>> 4) % 18)) * (0.75 + seoScore / 180),
    25,
    250_000,
  );
  const toxicRisk =
    seoScore > 72 && domainAuthority > 45 ? "low" : seoScore > 48 ? "medium" : "high";

  return {
    confidence: "ESTIMATED",
    estimatedBacklinks,
    referringDomains,
    domainAuthority,
    toxicBacklinkRisk: toxicRisk,
    chart: [
      { label: "Editorial", value: clamp(estimatedBacklinks * 0.38, 0, estimatedBacklinks) },
      { label: "Directories", value: clamp(estimatedBacklinks * 0.18, 0, estimatedBacklinks) },
      { label: "Partners", value: clamp(estimatedBacklinks * 0.2, 0, estimatedBacklinks) },
      { label: "Social/Profile", value: clamp(estimatedBacklinks * 0.14, 0, estimatedBacklinks) },
      { label: "Other", value: clamp(estimatedBacklinks * 0.1, 0, estimatedBacklinks) },
    ],
  };
};

const buildLocalSeo = (crawl: CrawlResult, business: BusinessDetection): LocalSeoSection => {
  const hasAddress = Boolean(business.address.formatted.value);
  const hasPhone = Boolean(business.phone.value);
  const hasLocalBusinessSchema = crawl.schemaOrg.some((item) =>
    JSON.stringify(item).toLowerCase().includes("localbusiness"),
  );
  const napConsistencyScore = clamp(
    (hasAddress ? 35 : 0) +
      (hasPhone ? 25 : 0) +
      (business.businessName.value ? 20 : 0) +
      (hasLocalBusinessSchema ? 20 : 0),
    0,
    100,
  );

  return {
    confidence: hasAddress || hasPhone ? "VERIFIED" : "ESTIMATED",
    hasAddress,
    hasPhone,
    hasLocalBusinessSchema,
    napConsistencyScore,
    reviewOpportunity:
      napConsistencyScore >= 75
        ? "Strong local foundation; focus on steady review velocity and location pages."
        : "Local trust signals need improvement before map-pack visibility can scale.",
    recommendations: [
      hasLocalBusinessSchema
        ? "Keep LocalBusiness schema synchronized with Google Business Profile."
        : "Add LocalBusiness schema with name, address, phone, opening hours, and sameAs links.",
      hasAddress
        ? "Audit citations for exact address formatting consistency."
        : "Publish a crawlable address or service-area statement where appropriate.",
      hasPhone
        ? "Use call tracking that preserves NAP consistency."
        : "Add a primary phone number in visible copy and schema.",
      "Create location/service pages with reviews, FAQs, map embeds, and local proof.",
    ],
  };
};

const buildSocialAnalysis = (crawl: CrawlResult, domain: string): SocialAnalysis => {
  const seed = hashString(domain);
  const profiles = crawl.contact.socialLinks;
  const connectedPlatforms = Object.values(profiles).filter((links) => links.length > 0).length;
  const platformLabels: Array<keyof SocialLinks> = [
    "facebook",
    "instagram",
    "linkedin",
    "twitter",
    "youtube",
    "pinterest",
  ];
  const estimatedFollowers = platformLabels.map((platform, index) => ({
    label: platform,
    value:
      profiles[platform].length > 0
        ? clamp(300 + ((seed >>> index) % 35_000), 50, 150_000)
        : 0,
  }));

  return {
    confidence: connectedPlatforms > 0 ? "VERIFIED" : "ESTIMATED",
    profiles,
    connectedPlatforms,
    estimatedFollowers,
    recommendations: [
      connectedPlatforms >= 3
        ? "Use UTM-tagged social profile links to measure assisted conversions."
        : "Link core social profiles from the website footer and Organization schema.",
      "Repurpose top SEO topics into short-form posts, carousels, and FAQ videos.",
      "Retarget visitors who reached service pages but did not convert.",
      "Keep brand handles, logo, and descriptions consistent across platforms.",
    ],
  };
};

const inferIntent = (keyword: string): EstimatedRankingKeyword["intent"] => {
  if (/\bnear me|local|city|location\b/i.test(keyword)) return "local";
  if (/\bbuy|book|quote|pricing|price|hire\b/i.test(keyword)) return "transactional";
  if (/\bbest|top|review|compare|alternative\b/i.test(keyword)) return "commercial";
  return "informational";
};

const buildKeywordAnalysis = (
  seo: SeoAnalysis,
  competitors: CompetitorReport,
  business: BusinessDetection,
): KeywordAnalysisSection => {
  const baseKeywords = [
    ...seo.keywordDensity.metrics.slice(0, 10).map((metric) => metric.keyword),
    ...competitors.nicheKeywords,
    `${business.category.value ?? "service"} near me`,
    `${business.category.value ?? "business"} pricing`,
  ];
  const uniqueKeywords = Array.from(new Set(baseKeywords.map((keyword) => keyword.toLowerCase())));
  const seed = hashString(uniqueKeywords.join("|"));
  const rankingKeywords = uniqueKeywords.slice(0, 18).map((keyword, index) => {
    const intent = inferIntent(keyword);
    const difficultyBase = intent === "transactional" ? 56 : intent === "commercial" ? 48 : 36;
    return {
      keyword,
      estimatedPosition: clamp(4 + ((seed >>> (index % 12)) % 44) - seo.scores.overall / 9, 1, 60),
      estimatedMonthlyVolume: clamp(
        80 + ((seed + index * 997) % 8_500) * (intent === "local" ? 0.55 : 1),
        20,
        20_000,
      ),
      difficulty: clamp(difficultyBase + ((seed + index * 31) % 28), 10, 95),
      intent,
      confidence: "ESTIMATED" as const,
    };
  });

  return {
    confidence: "ESTIMATED",
    rankingKeywords,
    primaryTopics: seo.keywordDensity.metrics.slice(0, 8).map((metric) => metric.keyword),
    contentGaps: [
      `Create a dedicated page for "${business.category.value ?? "core services"} pricing".`,
      "Add comparison content for top competitor and alternative searches.",
      "Publish FAQ content targeting long-tail questions found in sales calls.",
      "Build local-intent pages if the business serves multiple cities or regions.",
    ],
  };
};

export const runFullAnalysis = async (
  url: string,
  onProgress?: ProgressInput,
): Promise<CompleteAnalysisReport> => {
  await progress(onProgress, 5, "Starting website crawl.");
  const crawl = await crawlWebsite(url);

  await progress(onProgress, 24, "Detecting business identity and contact signals.");
  const business = detectBusiness(crawl);

  await progress(onProgress, 40, "Analyzing SEO health, content, images, and technical signals.");
  const seo = await analyzeCrawl(crawl);

  await progress(onProgress, 55, "Estimating traffic, engagement, and audience patterns.");
  const traffic = estimateTraffic(crawl.domain || url, seo.scores.overall);

  await progress(onProgress, 68, "Building competitor benchmarks.");
  const competitors = findCompetitors(
    crawl.domain || url,
    business.category.value ?? "local business",
  );

  await progress(onProgress, 80, "Generating AI growth advisor report.");
  const ai = await generateAiReport(seo, traffic, competitors, business);

  await progress(onProgress, 92, "Compiling backlink, local SEO, social, and keyword estimates.");
  const backlinks = buildBacklinkEstimate(crawl.domain || url, seo.scores.overall);
  const localSeo = buildLocalSeo(crawl, business);
  const socialAnalysis = buildSocialAnalysis(crawl, crawl.domain || url);
  const keywordAnalysis = buildKeywordAnalysis(seo, competitors, business);

  const report: CompleteAnalysisReport = {
    seoScore: seo.scores.overall,
    performanceScore: seo.coreWebVitals.performanceScore,
    healthScore: Math.round((seo.scores.technical + seo.scores.security) / 2),
    summary: ai.executiveSummary,
    meta: {
      generatedAt: new Date().toISOString(),
      version: "1.0.0",
      disclaimer:
        "VERIFIED data is directly observed from the crawled page or configured APIs. ESTIMATED data is generated from deterministic heuristics and should be validated with analytics, Search Console, ad platforms, and CRM data. AI_GENERATED recommendations are strategic guidance and not guaranteed outcomes.",
      confidenceLegend: {
        VERIFIED: "Observed directly from the website crawl or connected API.",
        ESTIMATED: "Modeled by SEO Vision AI heuristics for planning and benchmarking.",
        AI_GENERATED: "Generated strategic narrative based on verified and estimated inputs.",
      },
    },
    input: {
      url,
      normalizedUrl: crawl.normalizedUrl,
      domain: crawl.domain,
    },
    crawl,
    business,
    seo,
    traffic,
    competitors,
    ai,
    backlinks,
    localSeo,
    socialAnalysis,
    keywordAnalysis,
  };

  await progress(onProgress, 100, "Analysis complete.");
  return report;
};

export const runFullAnalysisForReport = async (
  reportId: string,
  url: string,
  onProgress?: ProgressCallback,
): Promise<CompleteAnalysisReport> => {
  const persistProgress: ProgressCallback = async (value, message) => {
    await onProgress?.(value, message);
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: statusFromProgress(value),
        progress: value,
        statusMessage: message,
      },
    });
  };

  try {
    const report = await runFullAnalysis(url, persistProgress);
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: "COMPLETED",
        progress: 100,
        statusMessage: "Analysis complete.",
        errorMessage: null,
        seoScore: report.seo.scores.overall,
        performanceScore: report.seo.coreWebVitals.performanceScore,
        healthScore: Math.round(
          (report.seo.scores.technical + report.seo.scores.security) / 2,
        ),
        summary: report.ai.executiveSummary,
        data: JSON.stringify(report),
        completedAt: new Date(),
      },
    });
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: "FAILED",
        progress: 100,
        statusMessage: "Analysis failed.",
        errorMessage: message,
      },
    });
    throw error;
  }
};

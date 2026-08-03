import axios from "axios";

import { config } from "../config.js";
import type { CrawlResult, DataConfidence } from "./crawler.js";

export type IssueSeverity = "high" | "medium" | "low";

export interface ScoreBreakdown {
  technical: number;
  onPage: number;
  content: number;
  images: number;
  security: number;
  overall: number;
  confidence: DataConfidence;
}

export interface OneClickFix {
  title: string;
  current: string;
  suggested: string;
  copyText: string;
}

export interface SeoIssue {
  id: string;
  severity: IssueSeverity;
  category: keyof Omit<ScoreBreakdown, "overall" | "confidence">;
  title: string;
  description: string;
  fix: OneClickFix;
}

export interface KeywordDensity {
  keyword: string;
  count: number;
  density: number;
}

export interface ReadabilityMetric {
  score: number;
  grade: string;
  words: number;
  sentences: number;
  averageWordsPerSentence: number;
  confidence: DataConfidence;
}

export interface SpamMetric {
  score: number;
  risk: "low" | "medium" | "high";
  signals: string[];
  confidence: DataConfidence;
}

export interface CoreWebVitalsEstimate {
  lcpMs: number;
  inpMs: number;
  cls: number;
  ttfbMs: number;
  performanceScore: number;
  estimated: boolean;
  source: "pagespeed" | "heuristic";
  confidence: DataConfidence;
  notes: string[];
}

export interface MetricGroup<T> {
  confidence: DataConfidence;
  metrics: T;
}

export interface SeoAnalysis {
  url: string;
  domain: string;
  generatedAt: string;
  scores: ScoreBreakdown;
  coreWebVitals: CoreWebVitalsEstimate;
  keywordDensity: MetricGroup<KeywordDensity[]>;
  readability: ReadabilityMetric;
  spam: SpamMetric;
  issues: SeoIssue[];
  strengths: string[];
  recommendations: string[];
  metricGroups: {
    technical: MetricGroup<Record<string, number | boolean | string | undefined>>;
    onPage: MetricGroup<Record<string, number | boolean | string | undefined>>;
    content: MetricGroup<Record<string, number | boolean | string | undefined>>;
    images: MetricGroup<Record<string, number | boolean | string | undefined>>;
    security: MetricGroup<Record<string, number | boolean | string | undefined>>;
  };
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const clampFloat = (value: number, min: number, max: number, decimals = 2): number => {
  const bounded = Math.max(min, Math.min(max, value));
  return Number(bounded.toFixed(decimals));
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .match(/[a-z0-9]+(?:['-][a-z0-9]+)?/g) ?? [];

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "can",
  "could",
  "does",
  "each",
  "from",
  "have",
  "here",
  "into",
  "more",
  "most",
  "only",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "under",
  "very",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

const issue = (
  id: string,
  severity: IssueSeverity,
  category: SeoIssue["category"],
  title: string,
  description: string,
  current: string,
  suggested: string,
  copyText: string,
): SeoIssue => ({
  id,
  severity,
  category,
  title,
  description,
  fix: { title, current, suggested, copyText },
});

const titleSuggestion = (crawl: CrawlResult): string => {
  const candidate =
    crawl.contact.businessNameCandidates[0] ??
    crawl.openGraph.site_name ??
    crawl.domain.split(".")[0];
  return `${candidate} | Services, Reviews & Contact Information`.slice(0, 62);
};

const descriptionSuggestion = (crawl: CrawlResult): string => {
  const businessName =
    crawl.contact.businessNameCandidates[0] ?? crawl.domain.replace(/\.[a-z]+$/i, "");
  return `Discover ${businessName}: services, customer benefits, contact details, and trusted solutions. Request a quote or consultation today.`;
};

const calculateKeywordDensity = (bodyText: string): KeywordDensity[] => {
  const words = tokenize(bodyText).filter(
    (word) => word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word),
  );
  if (words.length === 0) return [];

  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: clampFloat((count / words.length) * 100, 0, 100),
    }));
};

const countSyllables = (word: string): number => {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  const groups = cleaned.replace(/e\b/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
};

const calculateReadability = (bodyText: string): ReadabilityMetric => {
  const words = tokenize(bodyText);
  const sentenceMatches = bodyText.match(/[^.!?]+[.!?]+/g);
  const sentences = Math.max(1, sentenceMatches?.length ?? Math.ceil(words.length / 18));
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  const score =
    words.length === 0
      ? 0
      : 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);

  const rounded = clamp(score);
  const grade =
    rounded >= 80
      ? "Easy"
      : rounded >= 60
        ? "Standard"
        : rounded >= 40
          ? "Difficult"
          : "Very difficult";

  return {
    score: rounded,
    grade,
    words: words.length,
    sentences,
    averageWordsPerSentence: clampFloat(words.length / sentences, 0, 100, 1),
    confidence: "ESTIMATED",
  };
};

const calculateSpam = (crawl: CrawlResult, density: KeywordDensity[]): SpamMetric => {
  const signals: string[] = [];
  let score = 4;

  const topDensity = density[0]?.density ?? 0;
  if (topDensity > 8) {
    score += 30;
    signals.push(`Top keyword density is high at ${topDensity}%.`);
  } else if (topDensity > 5) {
    score += 16;
    signals.push(`Top keyword density is elevated at ${topDensity}%.`);
  }

  const externalRatio =
    crawl.links.all.length > 0 ? crawl.links.external.length / crawl.links.all.length : 0;
  if (externalRatio > 0.55 && crawl.links.external.length > 20) {
    score += 20;
    signals.push("External links outweigh internal links.");
  }

  const keywordCount = crawl.meta.keywords?.split(",").filter(Boolean).length ?? 0;
  if (keywordCount > 18) {
    score += 14;
    signals.push("Meta keywords tag appears overloaded.");
  }

  if ((crawl.title?.match(/[!$%]{2,}/g)?.length ?? 0) > 0) {
    score += 10;
    signals.push("Title contains spam-like punctuation patterns.");
  }

  if (crawl.wordCount < 120 && crawl.links.external.length > 15) {
    score += 16;
    signals.push("Thin content combined with many outbound links.");
  }

  const bounded = clamp(score);
  return {
    score: bounded,
    risk: bounded >= 55 ? "high" : bounded >= 28 ? "medium" : "low",
    signals,
    confidence: "ESTIMATED",
  };
};

const fetchPagespeedVitals = async (
  crawl: CrawlResult,
): Promise<CoreWebVitalsEstimate | undefined> => {
  if (!config.apiKeys.pagespeed) return undefined;

  try {
    const response = await axios.get("https://www.googleapis.com/pagespeedonline/v5/runPagespeed", {
      timeout: 20_000,
      params: {
        url: crawl.finalUrl,
        key: config.apiKeys.pagespeed,
        strategy: "mobile",
        category: "performance",
      },
    });

    const audits = response.data?.lighthouseResult?.audits ?? {};
    const categories = response.data?.lighthouseResult?.categories ?? {};
    const lcp = Number(audits["largest-contentful-paint"]?.numericValue);
    const tbt = Number(audits["total-blocking-time"]?.numericValue);
    const cls = Number(audits["cumulative-layout-shift"]?.numericValue);
    const ttfb = Number(audits["server-response-time"]?.numericValue);
    const performanceScore = Number(categories.performance?.score);

    return {
      lcpMs: Number.isFinite(lcp) ? Math.round(lcp) : 0,
      inpMs: Number.isFinite(tbt) ? Math.round(Math.max(80, tbt + 50)) : 0,
      cls: Number.isFinite(cls) ? clampFloat(cls, 0, 1, 3) : 0,
      ttfbMs: Number.isFinite(ttfb) ? Math.round(ttfb) : 0,
      performanceScore: Number.isFinite(performanceScore)
        ? clamp(performanceScore * 100)
        : 0,
      estimated: false,
      source: "pagespeed",
      confidence: "VERIFIED",
      notes: [
        "Measured through Google PageSpeed Insights API for the requested URL.",
        "INP is approximated from total blocking time where field INP is unavailable.",
      ],
    };
  } catch {
    return undefined;
  }
};

const estimateVitals = (crawl: CrawlResult): CoreWebVitalsEstimate => {
  const sizeKb = crawl.pageSizeBytes / 1024;
  const missingDimensions = crawl.images.filter((image) => !image.width || !image.height).length;
  const lcpMs = Math.round(
    1_250 + sizeKb * 3.2 + crawl.images.length * 85 + crawl.redirectChainLength * 160,
  );
  const inpMs = Math.round(
    85 + sizeKb * 0.18 + crawl.links.external.length * 1.6 + crawl.images.length * 2.4,
  );
  const cls = clampFloat(
    (crawl.meta.viewport ? 0.02 : 0.12) +
      (crawl.images.length > 0 ? (missingDimensions / crawl.images.length) * 0.18 : 0),
    0,
    0.75,
    3,
  );
  const ttfbMs = Math.round(260 + crawl.redirectChainLength * 120 + (crawl.isHttps ? 0 : 60));
  const performanceScore = clamp(
    100 -
      Math.max(0, (lcpMs - 2_500) / 65) -
      Math.max(0, (inpMs - 200) / 10) -
      Math.max(0, (cls - 0.1) * 120) -
      Math.max(0, (ttfbMs - 600) / 20),
  );

  return {
    lcpMs,
    inpMs,
    cls,
    ttfbMs,
    performanceScore,
    estimated: true,
    source: "heuristic",
    confidence: "ESTIMATED",
    notes: [
      "Estimated from HTML size, image count, missing dimensions, HTTPS, and redirects.",
      "Connect Google PageSpeed Insights for measured lab and field data.",
    ],
  };
};

const calculateScores = (crawl: CrawlResult, spam: SpamMetric): ScoreBreakdown => {
  const titleLength = crawl.title?.length ?? 0;
  const descriptionLength = crawl.meta.description?.length ?? 0;
  const imageAltRate =
    crawl.images.length > 0
      ? crawl.images.filter((image) => image.alt && image.alt.length > 0).length /
        crawl.images.length
      : 1;
  const lazyRate =
    crawl.images.length > 0
      ? crawl.images.filter((image) => image.loading === "lazy").length / crawl.images.length
      : 1;
  const externalHttpResources = [...crawl.links.all.map((link) => link.href), ...crawl.images.map((image) => image.src)]
    .filter((href) => href.startsWith("http://")).length;

  const technical = clamp(
    (crawl.success ? 15 : 0) +
      (crawl.statusCode && crawl.statusCode < 400 ? 12 : 0) +
      (crawl.isHttps ? 10 : 0) +
      (crawl.redirectChainLength <= 1 ? 8 : crawl.redirectChainLength <= 3 ? 4 : 0) +
      (crawl.robotsTxt.exists ? 8 : 0) +
      (crawl.sitemapXml.exists ? 10 : 0) +
      (crawl.meta.canonical ? 10 : 0) +
      (crawl.meta.viewport ? 8 : 0) +
      (crawl.meta.charset ? 6 : 0) +
      (crawl.meta.lang ? 5 : 0) +
      (crawl.schemaOrg.length > 0 ? 8 : 0),
  );

  const onPage = clamp(
    (titleLength >= 30 && titleLength <= 65 ? 22 : titleLength > 0 ? 12 : 0) +
      (descriptionLength >= 120 && descriptionLength <= 165
        ? 22
        : descriptionLength > 0
          ? 12
          : 0) +
      (crawl.headings.h1.length === 1 ? 14 : crawl.headings.h1.length > 0 ? 8 : 0) +
      (crawl.headings.h2.length >= 2 ? 10 : crawl.headings.h2.length > 0 ? 6 : 0) +
      (crawl.meta.canonical ? 8 : 0) +
      (Object.keys(crawl.openGraph).length >= 3 ? 9 : 0) +
      (Object.keys(crawl.twitterCards).length >= 2 ? 7 : 0) +
      (crawl.links.internal.length >= 5 ? 8 : crawl.links.internal.length > 0 ? 4 : 0),
  );

  const content = clamp(
    (crawl.wordCount >= 700 ? 26 : crawl.wordCount >= 300 ? 20 : crawl.wordCount >= 150 ? 12 : 0) +
      (crawl.headings.h1.length > 0 && crawl.headings.h2.length > 0 ? 14 : 4) +
      (crawl.contact.emails.length > 0 || crawl.contact.phones.length > 0 ? 10 : 4) +
      (crawl.contact.businessNameCandidates.length > 0 ? 8 : 0) +
      (crawl.schemaOrg.length > 0 ? 12 : 0) +
      (spam.score < 20 ? 12 : spam.score < 40 ? 7 : 0) +
      (crawl.links.internal.length > crawl.links.external.length ? 8 : 4) +
      (crawl.meta.keywords ? 2 : 0),
  );

  const images = clamp(
    imageAltRate * 42 +
      lazyRate * 18 +
      (crawl.images.length <= 25 ? 12 : crawl.images.length <= 60 ? 8 : 3) +
      (crawl.images.every((image) => image.width && image.height) ? 14 : 4) +
      (crawl.images.length > 0 ? 14 : 6),
  );

  const security = clamp(
    (crawl.isHttps ? 45 : 0) +
      (externalHttpResources === 0 ? 20 : externalHttpResources < 4 ? 10 : 0) +
      (crawl.meta.robots?.toLowerCase().includes("noindex") ? 0 : 12) +
      (crawl.contact.emails.length <= 3 ? 8 : 4) +
      (crawl.statusCode && crawl.statusCode < 400 ? 15 : 0),
  );

  const overall = clamp(
    technical * 0.25 + onPage * 0.25 + content * 0.22 + images * 0.13 + security * 0.15,
  );

  return { technical, onPage, content, images, security, overall, confidence: "VERIFIED" };
};

const buildIssues = (crawl: CrawlResult, scores: ScoreBreakdown, spam: SpamMetric): SeoIssue[] => {
  const issues: SeoIssue[] = [];
  const titleLength = crawl.title?.length ?? 0;
  const descriptionLength = crawl.meta.description?.length ?? 0;

  if (!crawl.success || (crawl.statusCode ?? 0) >= 400) {
    issues.push(
      issue(
        "page-fetch-status",
        "high",
        "technical",
        "Resolve crawlable page status",
        "Search engines may not index the page reliably if it returns an error or blocked response.",
        String(crawl.statusCode ?? "No response"),
        "Return a stable 200 status for the canonical page.",
        "Check hosting, redirects, firewall rules, and CMS routing so the canonical URL returns HTTP 200.",
      ),
    );
  }

  if (!crawl.isHttps) {
    issues.push(
      issue(
        "https-required",
        "high",
        "security",
        "Enable HTTPS site-wide",
        "HTTPS is a trust, browser, and ranking baseline.",
        "The crawled URL uses HTTP.",
        "Serve the site over HTTPS and redirect HTTP traffic to HTTPS.",
        "Install an SSL certificate and add a 301 redirect from http:// to https://.",
      ),
    );
  }

  if (titleLength < 30 || titleLength > 65) {
    issues.push(
      issue(
        "title-length",
        titleLength === 0 ? "high" : "medium",
        "onPage",
        "Improve the SEO title",
        "The title tag should be specific, benefit-led, and usually 30-65 characters.",
        crawl.title ?? "Missing title tag",
        titleSuggestion(crawl),
        `<title>${titleSuggestion(crawl)}</title>`,
      ),
    );
  }

  if (descriptionLength < 120 || descriptionLength > 165) {
    const suggested = descriptionSuggestion(crawl);
    issues.push(
      issue(
        "meta-description",
        descriptionLength === 0 ? "high" : "medium",
        "onPage",
        "Rewrite the meta description",
        "A useful meta description improves search snippets and click-through rate.",
        crawl.meta.description ?? "Missing meta description",
        suggested,
        `<meta name="description" content="${suggested}">`,
      ),
    );
  }

  if (crawl.headings.h1.length !== 1) {
    issues.push(
      issue(
        "h1-structure",
        crawl.headings.h1.length === 0 ? "high" : "medium",
        "content",
        "Use one clear H1",
        "Pages perform best with one primary H1 that matches the page intent.",
        `${crawl.headings.h1.length} H1 tags found`,
        "Use exactly one concise H1 describing the main service or page topic.",
        "<h1>Your primary service or business value proposition</h1>",
      ),
    );
  }

  if (!crawl.meta.canonical) {
    issues.push(
      issue(
        "canonical-missing",
        "medium",
        "technical",
        "Add a canonical URL",
        "Canonical tags reduce duplicate-content ambiguity.",
        "Missing canonical tag",
        crawl.finalUrl,
        `<link rel="canonical" href="${crawl.finalUrl}">`,
      ),
    );
  }

  if (!crawl.meta.viewport) {
    issues.push(
      issue(
        "viewport-missing",
        "high",
        "technical",
        "Add a mobile viewport tag",
        "Mobile rendering affects usability and search performance.",
        "Missing viewport meta tag",
        "width=device-width, initial-scale=1",
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
      ),
    );
  }

  if (!crawl.sitemapXml.exists) {
    issues.push(
      issue(
        "sitemap-missing",
        "medium",
        "technical",
        "Publish an XML sitemap",
        "Sitemaps help search engines discover important URLs faster.",
        "No sitemap.xml detected",
        `${new URL("/sitemap.xml", crawl.finalUrl).toString()}`,
        "Generate and submit an XML sitemap in Google Search Console.",
      ),
    );
  }

  if (!crawl.robotsTxt.exists) {
    issues.push(
      issue(
        "robots-missing",
        "low",
        "technical",
        "Add robots.txt",
        "A robots.txt file clarifies crawler permissions and sitemap location.",
        "No robots.txt detected",
        `Sitemap: ${new URL("/sitemap.xml", crawl.finalUrl).toString()}`,
        `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", crawl.finalUrl).toString()}`,
      ),
    );
  }

  const imagesMissingAlt = crawl.images.filter((image) => !image.alt).length;
  if (imagesMissingAlt > 0) {
    issues.push(
      issue(
        "image-alt",
        imagesMissingAlt > 5 ? "medium" : "low",
        "images",
        "Add descriptive image alt text",
        "Alt text improves accessibility and image search relevance.",
        `${imagesMissingAlt} images missing alt text`,
        "Add concise descriptions to key images.",
        '<img src="/image.jpg" alt="Describe the service, location, or product shown">',
      ),
    );
  }

  if (crawl.wordCount < 300) {
    issues.push(
      issue(
        "thin-content",
        "medium",
        "content",
        "Expand page content",
        "Thin pages struggle to satisfy search intent and earn rankings.",
        `${crawl.wordCount} words detected`,
        "Build at least 500-800 useful words around services, proof, FAQs, and next steps.",
        "Add sections for services, benefits, process, testimonials, FAQs, and a strong call to action.",
      ),
    );
  }

  if (spam.risk !== "low") {
    issues.push(
      issue(
        "spam-risk",
        spam.risk === "high" ? "high" : "medium",
        "content",
        "Reduce spam-like SEO signals",
        "Keyword stuffing or thin outbound-heavy content can suppress trust.",
        spam.signals.join(" ") || `Spam score ${spam.score}`,
        "Use natural phrasing, consolidate repeated terms, and make outbound links purposeful.",
        "Rewrite repetitive copy into helpful, intent-matched paragraphs with proof and examples.",
      ),
    );
  }

  if (scores.overall >= 80 && issues.length === 0) {
    issues.push(
      issue(
        "incremental-optimization",
        "low",
        "content",
        "Add structured FAQs for more SERP coverage",
        "The page is healthy; FAQ content can capture long-tail queries and rich results.",
        "No critical SEO issues detected",
        "Add 4-6 customer-focused FAQs with FAQPage schema.",
        '{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Common customer question?","acceptedAnswer":{"@type":"Answer","text":"Helpful answer."}}]}',
      ),
    );
  }

  return issues.sort((a, b) => {
    const order: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
};

export const analyzeCrawl = async (crawl: CrawlResult): Promise<SeoAnalysis> => {
  const keywordDensity = calculateKeywordDensity(crawl.bodyText);
  const readability = calculateReadability(crawl.bodyText);
  const spam = calculateSpam(crawl, keywordDensity);
  const scores = calculateScores(crawl, spam);
  const coreWebVitals = (await fetchPagespeedVitals(crawl)) ?? estimateVitals(crawl);
  const issues = buildIssues(crawl, scores, spam);
  const altCount = crawl.images.filter((image) => image.alt).length;

  const strengths = [
    crawl.isHttps ? "HTTPS is enabled." : undefined,
    crawl.meta.canonical ? "Canonical URL is present." : undefined,
    crawl.schemaOrg.length > 0 ? "Structured data was detected." : undefined,
    crawl.headings.h1.length === 1 ? "The page has a single primary H1." : undefined,
    crawl.sitemapXml.exists ? "XML sitemap is reachable." : undefined,
  ].filter((value): value is string => Boolean(value));

  const recommendations = issues.slice(0, 8).map((item) => item.fix.suggested);

  return {
    url: crawl.finalUrl,
    domain: crawl.domain,
    generatedAt: new Date().toISOString(),
    scores,
    coreWebVitals,
    keywordDensity: {
      confidence: "VERIFIED",
      metrics: keywordDensity,
    },
    readability,
    spam,
    issues,
    strengths,
    recommendations,
    metricGroups: {
      technical: {
        confidence: "VERIFIED",
        metrics: {
          statusCode: crawl.statusCode,
          redirectChainLength: crawl.redirectChainLength,
          robotsTxt: crawl.robotsTxt.exists,
          sitemapXml: crawl.sitemapXml.exists,
          canonical: Boolean(crawl.meta.canonical),
          viewport: Boolean(crawl.meta.viewport),
          charset: crawl.meta.charset,
          lang: crawl.meta.lang,
        },
      },
      onPage: {
        confidence: "VERIFIED",
        metrics: {
          titleLength: crawl.title?.length ?? 0,
          descriptionLength: crawl.meta.description?.length ?? 0,
          h1Count: crawl.headings.h1.length,
          h2Count: crawl.headings.h2.length,
          openGraphTags: Object.keys(crawl.openGraph).length,
          twitterCardTags: Object.keys(crawl.twitterCards).length,
        },
      },
      content: {
        confidence: "VERIFIED",
        metrics: {
          wordCount: crawl.wordCount,
          readabilityScore: readability.score,
          topKeywordDensity: keywordDensity[0]?.density ?? 0,
          spamScore: spam.score,
          businessNameDetected: crawl.contact.businessNameCandidates.length > 0,
        },
      },
      images: {
        confidence: "VERIFIED",
        metrics: {
          imageCount: crawl.images.length,
          imagesWithAlt: altCount,
          altCoveragePercent:
            crawl.images.length > 0 ? clamp((altCount / crawl.images.length) * 100) : 100,
          lazyLoadedImages: crawl.images.filter((image) => image.loading === "lazy").length,
        },
      },
      security: {
        confidence: "VERIFIED",
        metrics: {
          https: crawl.isHttps,
          exposedEmails: crawl.contact.emails.length,
          noindex: crawl.meta.robots?.toLowerCase().includes("noindex") ?? false,
        },
      },
    },
  };
};

import axios from "axios";

import { config } from "../config.js";
import type { BusinessDetection } from "./businessDetector.js";
import type { DataConfidence } from "./crawler.js";
import type { CompetitorReport } from "./competitorFinder.js";
import type { SeoAnalysis } from "./seoAnalyzer.js";
import type { TrafficEstimate } from "./trafficEstimator.js";

export type ActionPriority = "high" | "medium" | "low";

export interface ActionTask {
  title: string;
  priority: ActionPriority;
  owner: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
}

export interface ActionPlanPhase {
  phase: "30 days" | "60 days" | "90 days";
  theme: string;
  tasks: ActionTask[];
}

export interface AiReportSection {
  title: string;
  summary: string;
  bullets: string[];
}

export interface AiReport {
  confidence: DataConfidence;
  source: "openai" | "heuristic";
  generatedAt: string;
  executiveSummary: string;
  status: string;
  growthPotential: string;
  estimatedTimeline: string;
  whatPerformsWell: string[];
  needsImprovement: string[];
  whyRankingsAreLow: string[];
  howToIncreaseTraffic: string[];
  howToIncreaseLeads: string[];
  howToIncreaseConversions: string[];
  howToBeatCompetitors: string[];
  sections: {
    problems: AiReportSection;
    seoMistakes: AiReportSection;
    marketingOpportunities: AiReportSection;
    revenueIdeas: AiReportSection;
    branding: AiReportSection;
    ux: AiReportSection;
    conversion: AiReportSection;
    localSeo: AiReportSection;
    socialStrategies: {
      facebook: string[];
      instagram: string[];
      linkedin: string[];
      youtube: string[];
    };
    paidAds: AiReportSection;
    automation: AiReportSection;
    crm: AiReportSection;
    retention: AiReportSection;
  };
  actionPlan: ActionPlanPhase[];
}

const firstSentence = (value: string): string => value.split(/(?<=[.!?])\s+/)[0] ?? value;

const scoreLabel = (score: number): string => {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 55) return "developing";
  if (score >= 40) return "weak";
  return "critical";
};

const topIssues = (analysis: SeoAnalysis, count = 4): string[] =>
  analysis.issues.slice(0, count).map((issue) => issue.title);

const buildExecutiveSummary = (
  analysis: SeoAnalysis,
  traffic: TrafficEstimate,
  competitors: CompetitorReport,
  business: BusinessDetection,
): string => {
  const name = business.businessName.value ?? analysis.domain;
  const label = scoreLabel(analysis.scores.overall);
  const competitorGap =
    competitors.comparison.find((metric) => metric.metric === "Domain Authority")?.gap ?? 0;
  const gapText =
    competitorGap >= 0
      ? "already competes well on authority signals"
      : `trails estimated competitor authority by ${Math.abs(competitorGap)} points`;

  return `${name} has a ${label} SEO foundation with an overall score of ${analysis.scores.overall}/100 and an estimated ${traffic.visitors.monthly.toLocaleString()} monthly visitors. The fastest growth path is to fix ${topIssues(analysis, 2).join(" and ") || "technical gaps"}, expand intent-matched content, and strengthen conversion pathways. The brand ${gapText}, so disciplined execution over the next quarter can improve search visibility, lead quality, and revenue capture.`;
};

const requestOpenAiNarrative = async (
  analysis: SeoAnalysis,
  traffic: TrafficEstimate,
  competitors: CompetitorReport,
  business: BusinessDetection,
): Promise<string | undefined> => {
  if (!config.apiKeys.openai) return undefined;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.45,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You are a senior SEO, growth, and conversion strategist. Return concise executive narrative only. Do not invent measured third-party data; call estimates estimates.",
          },
          {
            role: "user",
            content: JSON.stringify({
              business: {
                name: business.businessName.value,
                category: business.category.value,
                industry: business.industry.value,
              },
              seoScore: analysis.scores.overall,
              scores: analysis.scores,
              topIssues: analysis.issues.slice(0, 8),
              traffic: traffic.visitors,
              acquisition: traffic.acquisition,
              competitors: competitors.competitors.slice(0, 5),
            }),
          },
        ],
      },
      {
        timeout: 25_000,
        headers: {
          Authorization: `Bearer ${config.apiKeys.openai}`,
          "Content-Type": "application/json",
        },
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : undefined;
  } catch {
    return undefined;
  }
};

const section = (title: string, summary: string, bullets: string[]): AiReportSection => ({
  title,
  summary,
  bullets,
});

const buildActionPlan = (analysis: SeoAnalysis): ActionPlanPhase[] => {
  const highImpactIssues = analysis.issues.filter((issue) => issue.severity === "high");
  return [
    {
      phase: "30 days",
      theme: "Repair crawlability, trust, and conversion basics",
      tasks: [
        {
          title: highImpactIssues[0]?.fix.suggested ?? "Fix critical technical SEO blockers",
          priority: "high",
          owner: "Developer / SEO",
          expectedImpact: "Improves indexability and removes ranking suppression risk.",
          effort: "medium",
        },
        {
          title: "Rewrite title tags, meta descriptions, and H1s around buying intent",
          priority: "high",
          owner: "SEO Content",
          expectedImpact: "Higher click-through rate and clearer topical relevance.",
          effort: "low",
        },
        {
          title: "Add prominent calls to action, contact options, and trust proof above the fold",
          priority: "high",
          owner: "Marketing / Design",
          expectedImpact: "More leads from existing traffic.",
          effort: "medium",
        },
      ],
    },
    {
      phase: "60 days",
      theme: "Build authority and demand capture",
      tasks: [
        {
          title: "Publish service pages and FAQs targeting high-intent long-tail keywords",
          priority: "high",
          owner: "SEO Content",
          expectedImpact: "Expands ranking footprint for commercial searches.",
          effort: "medium",
        },
        {
          title: "Implement Organization, LocalBusiness, Breadcrumb, and FAQ schema",
          priority: "medium",
          owner: "Developer / SEO",
          expectedImpact: "Improves entity clarity and rich-result eligibility.",
          effort: "medium",
        },
        {
          title: "Launch review generation and local citation cleanup",
          priority: "medium",
          owner: "Operations",
          expectedImpact: "Strengthens local trust and map-pack visibility.",
          effort: "medium",
        },
      ],
    },
    {
      phase: "90 days",
      theme: "Scale acquisition, retention, and reporting",
      tasks: [
        {
          title: "Create competitor comparison content and digital PR outreach",
          priority: "medium",
          owner: "Growth / PR",
          expectedImpact: "Builds backlinks, authority, and comparison-stage demand.",
          effort: "high",
        },
        {
          title: "Add CRM automation for lead scoring, follow-up, and reactivation",
          priority: "medium",
          owner: "Sales Operations",
          expectedImpact: "Increases close rate and reduces lead leakage.",
          effort: "medium",
        },
        {
          title: "Test paid search and retargeting campaigns against top organic pages",
          priority: "low",
          owner: "Paid Media",
          expectedImpact: "Captures immediate demand while organic work compounds.",
          effort: "medium",
        },
      ],
    },
  ];
};

export const generateAiReport = async (
  analysis: SeoAnalysis,
  traffic: TrafficEstimate,
  competitors: CompetitorReport,
  business: BusinessDetection,
): Promise<AiReport> => {
  const heuristicSummary = buildExecutiveSummary(analysis, traffic, competitors, business);
  const openAiNarrative = await requestOpenAiNarrative(analysis, traffic, competitors, business);
  const topKeyword = analysis.keywordDensity.metrics[0]?.keyword ?? business.category.value ?? "core service";
  const category = business.category.value ?? "business";
  const primaryCompetitor = competitors.competitors[0];
  const highIssues = analysis.issues.filter((issue) => issue.severity === "high");
  const mediumIssues = analysis.issues.filter((issue) => issue.severity === "medium");

  const trafficUpside =
    analysis.scores.overall >= 75
      ? "incremental gains of 10-25% are realistic through content expansion and conversion optimization"
      : analysis.scores.overall >= 55
        ? "meaningful gains of 25-60% are realistic after technical cleanup and content build-out"
        : "large upside exists, but technical repair and trust building must happen before growth compounds";

  return {
    confidence: "AI_GENERATED",
    source: openAiNarrative ? "openai" : "heuristic",
    generatedAt: new Date().toISOString(),
    executiveSummary: openAiNarrative ?? heuristicSummary,
    status: `Current digital status is ${scoreLabel(analysis.scores.overall)} (${analysis.scores.overall}/100 SEO score).`,
    growthPotential: `Based on estimated traffic, competitive gaps, and SEO health, ${trafficUpside}.`,
    estimatedTimeline:
      highIssues.length > 0
        ? "Expect 2-4 weeks for critical fixes to stabilize, 6-10 weeks for content improvements to index, and 3-6 months for stronger ranking movement."
        : "Expect 2-4 weeks for metadata and conversion wins, 6-12 weeks for new content visibility, and 3-4 months for authority-building impact.",
    whatPerformsWell: [
      ...analysis.strengths,
      `Estimated organic share is ${traffic.acquisition.organic}%, giving SEO a meaningful growth base.`,
      primaryCompetitor
        ? `Competitor benchmark available against ${primaryCompetitor.name}.`
        : "Competitive benchmark generated for the niche.",
    ].slice(0, 7),
    needsImprovement: [
      ...topIssues(analysis, 6),
      analysis.coreWebVitals.estimated
        ? "Connect PageSpeed Insights for measured performance diagnostics."
        : "Act on PageSpeed diagnostics to improve user experience.",
    ],
    whyRankingsAreLow: [
      mediumIssues.length + highIssues.length > 0
        ? `Search visibility is likely constrained by ${highIssues.length} high-priority and ${mediumIssues.length} medium-priority SEO issues.`
        : "Ranking limitations are more likely caused by content depth, authority, and competition than crawl blockers.",
      analysis.scores.content < 65
        ? "Content depth and topical coverage appear thin for competitive commercial queries."
        : "Content has a base to build from but needs more query-specific pages.",
      analysis.scores.technical < 70
        ? "Technical signals such as crawlability, canonicals, sitemap, viewport, or schema need improvement."
        : "Technical foundation is serviceable; authority and content velocity should be the next focus.",
    ],
    howToIncreaseTraffic: [
      `Build dedicated landing pages around "${topKeyword}" and related buying-intent keywords.`,
      "Publish comparison, pricing, FAQ, and location pages that answer bottom-funnel questions.",
      "Earn backlinks through partner pages, local sponsorships, expert quotes, and resource content.",
      "Refresh titles and descriptions to improve organic click-through rate.",
    ],
    howToIncreaseLeads: [
      "Place a primary call to action in the hero, mid-page proof section, and footer.",
      "Add phone, email, form, and booking options for different buyer preferences.",
      "Use testimonials, logos, certifications, case studies, guarantees, or reviews near conversion points.",
      "Create lead magnets such as audits, calculators, checklists, or consultations.",
    ],
    howToIncreaseConversions: [
      "Reduce friction in forms and ask only for fields needed to qualify the lead.",
      "Match landing page copy to the search intent and ad or snippet promise.",
      "Add urgency ethically with availability, response-time promises, or limited consultation slots.",
      "Track calls, forms, chat, and booked meetings as separate conversion events.",
    ],
    howToBeatCompetitors: [
      primaryCompetitor
        ? `Out-position ${primaryCompetitor.name} by creating deeper service pages and stronger local proof.`
        : "Create deeper service pages than competing generic sites.",
      "Target competitor comparison and alternative keywords with balanced, useful pages.",
      "Close backlink gaps with local PR, supplier links, associations, and community sponsorships.",
      "Use schema, reviews, and content freshness to make search snippets more compelling.",
    ],
    sections: {
      problems: section("Core problems", "The main blockers combine visibility, trust, and conversion issues.", [
        ...topIssues(analysis, 5),
        "Estimated competitor authority suggests the site needs more proof and backlinks.",
        "Traffic estimates should be validated with analytics and Search Console before budget decisions.",
      ]),
      seoMistakes: section("SEO mistakes", "The most expensive SEO mistakes are the ones that prevent useful pages from being understood.", [
        "Weak or missing metadata reduces snippet quality.",
        "Thin pages make it difficult to rank for competitive service terms.",
        "Missing schema leaves entity and local business signals ambiguous.",
        "Unoptimized images can hurt accessibility and perceived speed.",
      ]),
      marketingOpportunities: section("Marketing opportunities", "The site can turn SEO work into broader demand generation.", [
        `Create content clusters for ${category} questions, pricing, comparisons, and local intent.`,
        "Repurpose educational pages into email, social, and sales enablement assets.",
        "Use retargeting audiences from high-intent visitors who do not convert.",
        "Package proof into case studies and before/after outcomes.",
      ]),
      revenueIdeas: section("Revenue ideas", "Growth should connect traffic improvements to offers and follow-up.", [
        "Create tiered offers or packages so prospects can self-select budget fit.",
        "Introduce a quick-start consultation or audit to convert hesitant visitors.",
        "Add upsell and cross-sell journeys for existing customers.",
        "Use email nurturing for visitors who download resources or request pricing.",
      ]),
      branding: section("Branding", "Brand clarity improves both search behavior and conversion confidence.", [
        "Clarify the primary promise in one sentence above the fold.",
        "Use consistent naming, logos, tone, and proof across site and social profiles.",
        "Differentiate against competitors with a clear methodology, specialization, or guarantee.",
      ]),
      ux: section("User experience", "UX should help visitors understand, trust, and act quickly.", [
        "Make navigation service-led and reduce buried important pages.",
        "Improve mobile scanning with short sections, bullets, and sticky contact actions.",
        "Use Core Web Vitals findings to prioritize media and layout improvements.",
      ]),
      conversion: section("Conversion optimization", "The fastest revenue lift often comes from converting more current visitors.", [
        "Add above-the-fold CTA, proof, and benefit-led copy.",
        "Create dedicated landing pages for paid campaigns and high-intent organic terms.",
        "Measure forms, calls, chats, and bookings separately in analytics.",
      ]),
      localSeo: section("Local SEO", "Local visibility depends on consistency, reviews, and location relevance.", [
        "Verify and optimize Google Business Profile categories, services, photos, and Q&A.",
        "Keep NAP information consistent across directories and website schema.",
        "Build location pages with service details, local proof, maps, and testimonials.",
        "Ask satisfied customers for specific, keyword-rich reviews.",
      ]),
      socialStrategies: {
        facebook: [
          "Post customer proof, offers, events, and educational snippets weekly.",
          "Use retargeting ads for visitors who viewed service or pricing pages.",
          "Join local or niche groups where helpful participation is allowed.",
        ],
        instagram: [
          "Use reels and carousel posts to show outcomes, process, and behind-the-scenes trust.",
          "Turn FAQs into short visual explainers.",
          "Add profile links to booking, quote, or lead magnet pages.",
        ],
        linkedin: [
          "Publish authority posts from founders or experts around customer problems.",
          "Connect case studies to measurable business outcomes.",
          "Use employee advocacy to amplify new guides and announcements.",
        ],
        youtube: [
          "Create short answer videos for high-intent FAQs and objections.",
          "Embed videos on related service pages to improve engagement.",
          "Use video descriptions to link to conversion-focused landing pages.",
        ],
      },
      paidAds: section("Paid ads", "Paid media should validate offers and capture demand while SEO compounds.", [
        "Start with exact-match search campaigns for high-intent service keywords.",
        "Retarget organic visitors with proof-led creative and a clear offer.",
        "Separate branded, competitor, and non-brand campaigns for cleaner reporting.",
      ]),
      automation: section("Automation", "Automation prevents lead leakage and keeps prospects moving.", [
        "Send instant form confirmations with next-step expectations.",
        "Create nurture sequences by service interest and funnel stage.",
        "Alert sales teams when high-intent pages or repeat visits occur.",
      ]),
      crm: section("CRM", "CRM hygiene turns marketing activity into revenue intelligence.", [
        "Track source, landing page, keyword theme, and offer for every lead.",
        "Score leads by fit, urgency, and engagement.",
        "Build dashboards for lead quality, close rate, and revenue by channel.",
      ]),
      retention: section("Retention", "Retention grows lifetime value and creates new trust assets.", [
        "Create post-purchase onboarding and success check-ins.",
        "Ask for reviews and referrals at moments of customer satisfaction.",
        "Send useful newsletters that educate, not just promote.",
      ]),
    },
    actionPlan: buildActionPlan(analysis),
  };
};

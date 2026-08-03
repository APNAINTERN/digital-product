import type { DataConfidence } from "./crawler.js";

export interface CompetitorProfile {
  name: string;
  website: string;
  domainAuthority: number;
  monthlyTraffic: number;
  keywordsCount: number;
  backlinks: number;
  referringDomains: number;
  socialFollowers: number;
  strengths: string[];
  weaknesses: string[];
  confidence: DataConfidence;
}

export interface CompetitorComparisonMetric {
  metric: string;
  primary: number;
  competitorAverage: number;
  gap: number;
  unit: "score" | "visitors" | "keywords" | "links" | "followers";
  confidence: DataConfidence;
}

export interface CompetitorReport {
  domain: string;
  businessCategory: string;
  confidence: DataConfidence;
  generatedAt: string;
  nicheKeywords: string[];
  competitors: CompetitorProfile[];
  comparison: CompetitorComparisonMetric[];
}

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const rng = (seed: number): (() => number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10_000) / 10_000;
  };
};

const titleCase = (value: string): string =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const categoryTerms: Record<string, string[]> = {
  restaurant: ["restaurant", "dining", "catering", "menu", "reservations"],
  dental: ["dentist", "dental", "orthodontics", "implants", "smile"],
  legal: ["law firm", "attorney", "legal", "case review", "counsel"],
  realestate: ["real estate", "homes", "realtor", "property", "listings"],
  ecommerce: ["online store", "shop", "products", "deals", "delivery"],
  fitness: ["fitness", "gym", "training", "wellness", "classes"],
  healthcare: ["clinic", "healthcare", "medical", "patients", "appointments"],
  marketing: ["marketing", "agency", "branding", "seo", "growth"],
  technology: ["software", "technology", "platform", "automation", "analytics"],
  home: ["home services", "repair", "installation", "maintenance", "local service"],
};

const detectKeywordBucket = (text: string): string[] => {
  const lower = text.toLowerCase();
  for (const [bucket, terms] of Object.entries(categoryTerms)) {
    if (terms.some((term) => lower.includes(term)) || lower.includes(bucket)) {
      return terms;
    }
  }
  return ["local business", "services", "reviews", "pricing", "consultation"];
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const findCompetitors = (
  domain: string,
  businessCategory: string,
): CompetitorReport => {
  const seed = hashString(`${domain}:${businessCategory}`);
  const random = rng(seed);
  const domainBase = domain.replace(/^www\./, "").split(".")[0] ?? "business";
  const category = businessCategory || "local business";
  const baseTerms = detectKeywordBucket(`${domainBase} ${category}`);
  const nicheKeywords = [
    `${category} near me`,
    `best ${baseTerms[0]}`,
    `${baseTerms[1]} services`,
    `${baseTerms[2]} pricing`,
    `${domainBase.replace(/-/g, " ")} alternatives`,
  ].map((keyword) => keyword.toLowerCase());

  const namePrefixes = ["Prime", "Bright", "Summit", "Local", "Apex", "Metro", "Trusted"];
  const nameSuffixes = ["Group", "Co", "Experts", "Studio", "Pros", "Solutions", "Collective"];
  const competitorCount = 4 + (seed % 2);
  const competitors: CompetitorProfile[] = [];

  for (let index = 0; index < competitorCount; index += 1) {
    const prefix = namePrefixes[(seed + index * 3) % namePrefixes.length] ?? "Prime";
    const suffix = nameSuffixes[(seed + index * 5) % nameSuffixes.length] ?? "Group";
    const niche = titleCase(baseTerms[index % baseTerms.length] ?? category);
    const name = `${prefix} ${niche} ${suffix}`;
    const authority = Math.round(24 + random() * 48 + index * 2);
    const monthlyTraffic = Math.round((1_200 + random() * 80_000) * (0.75 + authority / 80));
    const keywordsCount = Math.round(220 + random() * 11_000 + authority * 26);
    const backlinks = Math.round(450 + random() * 65_000 + authority * 210);
    const referringDomains = Math.round(backlinks * (0.06 + random() * 0.08));
    const socialFollowers = Math.round(600 + random() * 120_000);

    competitors.push({
      name,
      website: `https://www.${slugify(name)}.com`,
      domainAuthority: Math.min(92, authority),
      monthlyTraffic,
      keywordsCount,
      backlinks,
      referringDomains,
      socialFollowers,
      strengths: [
        random() > 0.5
          ? "Strong branded search visibility"
          : "Consistent educational content cadence",
        random() > 0.5
          ? "Well-structured service landing pages"
          : "High review and social proof density",
        random() > 0.5 ? "Active local listings footprint" : "Broad backlink profile",
      ],
      weaknesses: [
        random() > 0.5
          ? "Several pages rely on generic title tags"
          : "Technical speed signals appear inconsistent",
        random() > 0.5
          ? "Blog topics are broad and not conversion-led"
          : "Local schema implementation looks incomplete",
      ],
      confidence: "ESTIMATED",
    });
  }

  const average = (selector: (profile: CompetitorProfile) => number): number =>
    Math.round(
      competitors.reduce((total, profile) => total + selector(profile), 0) /
        competitors.length,
    );

  const primaryAuthority = Math.round(22 + random() * 35);
  const primaryTraffic = Math.round(800 + random() * 45_000);
  const primaryKeywords = Math.round(150 + random() * 5_500);
  const primaryBacklinks = Math.round(250 + random() * 30_000);
  const primaryFollowers = Math.round(300 + random() * 65_000);

  const comparison: CompetitorComparisonMetric[] = [
    {
      metric: "Domain Authority",
      primary: primaryAuthority,
      competitorAverage: average((profile) => profile.domainAuthority),
      gap: primaryAuthority - average((profile) => profile.domainAuthority),
      unit: "score",
      confidence: "ESTIMATED",
    },
    {
      metric: "Monthly Traffic",
      primary: primaryTraffic,
      competitorAverage: average((profile) => profile.monthlyTraffic),
      gap: primaryTraffic - average((profile) => profile.monthlyTraffic),
      unit: "visitors",
      confidence: "ESTIMATED",
    },
    {
      metric: "Ranking Keywords",
      primary: primaryKeywords,
      competitorAverage: average((profile) => profile.keywordsCount),
      gap: primaryKeywords - average((profile) => profile.keywordsCount),
      unit: "keywords",
      confidence: "ESTIMATED",
    },
    {
      metric: "Backlinks",
      primary: primaryBacklinks,
      competitorAverage: average((profile) => profile.backlinks),
      gap: primaryBacklinks - average((profile) => profile.backlinks),
      unit: "links",
      confidence: "ESTIMATED",
    },
    {
      metric: "Social Followers",
      primary: primaryFollowers,
      competitorAverage: average((profile) => profile.socialFollowers),
      gap: primaryFollowers - average((profile) => profile.socialFollowers),
      unit: "followers",
      confidence: "ESTIMATED",
    },
  ];

  return {
    domain,
    businessCategory: category,
    confidence: "ESTIMATED",
    generatedAt: new Date().toISOString(),
    nicheKeywords,
    competitors,
    comparison,
  };
};

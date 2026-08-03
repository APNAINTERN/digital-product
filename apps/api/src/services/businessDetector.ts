import type { CrawlResult, DataConfidence, SocialLinks } from "./crawler.js";

export interface DetectedField<T> {
  value: T | null;
  confidence: DataConfidence;
  score: number;
  source: string;
}

export interface DetectedAddress {
  street: DetectedField<string>;
  city: DetectedField<string>;
  region: DetectedField<string>;
  postalCode: DetectedField<string>;
  country: DetectedField<string>;
  formatted: DetectedField<string>;
}

export interface BusinessDetection {
  confidence: DataConfidence;
  businessName: DetectedField<string>;
  organization: DetectedField<string>;
  category: DetectedField<string>;
  industry: DetectedField<string>;
  description: DetectedField<string>;
  phone: DetectedField<string>;
  email: DetectedField<string>;
  address: DetectedAddress;
  socialAccounts: DetectedField<SocialLinks>;
  companyType: DetectedField<string>;
  evidence: string[];
}

const emptySocialLinks = (): SocialLinks => ({
  facebook: [],
  instagram: [],
  linkedin: [],
  twitter: [],
  youtube: [],
  pinterest: [],
});

const field = <T>(
  value: T | null,
  confidence: DataConfidence,
  score: number,
  source: string,
): DetectedField<T> => ({
  value,
  confidence,
  score,
  source,
});

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed || null;
};

const flattenSchema = (items: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
  const flattened: Array<Record<string, unknown>> = [];
  for (const item of items) {
    flattened.push(item);
    const graph = item["@graph"];
    if (Array.isArray(graph)) {
      for (const child of graph) {
        if (child && typeof child === "object" && !Array.isArray(child)) {
          flattened.push(child as Record<string, unknown>);
        }
      }
    }
  }
  return flattened;
};

const schemaTypes = (item: Record<string, unknown>): string[] => {
  const type = item["@type"];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) {
    return type.filter((value): value is string => typeof value === "string");
  }
  return [];
};

const findBusinessSchema = (
  crawl: CrawlResult,
): Record<string, unknown> | undefined => {
  const schemas = flattenSchema(crawl.schemaOrg);
  return (
    schemas.find((item) =>
      schemaTypes(item).some((type) =>
        /localbusiness|organization|corporation|store|restaurant|professionalservice|medicalbusiness|legalservice/i.test(
          type,
        ),
      ),
    ) ?? schemas.find((item) => clean(item.name))
  );
};

const parseAddressObject = (
  schema: Record<string, unknown> | undefined,
  fallback: string | undefined,
): Record<string, string | undefined> => {
  const address = schema?.address;
  if (address && typeof address === "object" && !Array.isArray(address)) {
    const record = address as Record<string, unknown>;
    return {
      street: clean(record.streetAddress) ?? undefined,
      city: clean(record.addressLocality) ?? undefined,
      region: clean(record.addressRegion) ?? undefined,
      postalCode: clean(record.postalCode) ?? undefined,
      country: clean(record.addressCountry) ?? undefined,
      formatted: [
        clean(record.streetAddress),
        clean(record.addressLocality),
        clean(record.addressRegion),
        clean(record.postalCode),
        clean(record.addressCountry),
      ]
        .filter(Boolean)
        .join(", "),
    };
  }

  if (typeof address === "string") {
    return { formatted: clean(address) ?? undefined };
  }

  const formatted = fallback?.replace(/\s+/g, " ").trim();
  if (!formatted) return {};

  const parts = formatted.split(",").map((part) => part.trim());
  const postal = formatted.match(/\b[A-Z]?\d{4,6}(?:-\d{4})?\b/i)?.[0];
  return {
    street: parts[0],
    city: parts.length > 2 ? parts[1] : undefined,
    region: parts.length > 3 ? parts[2] : undefined,
    postalCode: postal,
    country: parts.length > 3 ? parts[parts.length - 1] : undefined,
    formatted,
  };
};

const categoryRules: Array<{ category: string; industry: string; patterns: RegExp[] }> = [
  {
    category: "Restaurant",
    industry: "Food & Beverage",
    patterns: [/restaurant|dining|menu|catering|cafe|bar/i],
  },
  {
    category: "Dental Practice",
    industry: "Healthcare",
    patterns: [/dentist|dental|orthodont|implant|smile/i],
  },
  {
    category: "Law Firm",
    industry: "Legal Services",
    patterns: [/law firm|attorney|lawyer|legal|litigation/i],
  },
  {
    category: "Real Estate Agency",
    industry: "Real Estate",
    patterns: [/real estate|realtor|property|homes for sale|brokerage/i],
  },
  {
    category: "Ecommerce Store",
    industry: "Retail",
    patterns: [/shop|store|cart|shipping|products|checkout/i],
  },
  {
    category: "Marketing Agency",
    industry: "Marketing & Advertising",
    patterns: [/marketing|seo|advertising|branding|agency|growth/i],
  },
  {
    category: "Home Services",
    industry: "Local Services",
    patterns: [/plumbing|roofing|hvac|repair|cleaning|contractor|installation/i],
  },
  {
    category: "Technology Company",
    industry: "Software & Technology",
    patterns: [/software|platform|api|automation|analytics|cloud|technology/i],
  },
];

const inferCategory = (crawl: CrawlResult, schema: Record<string, unknown> | undefined): {
  category: string;
  industry: string;
  source: string;
  confidence: DataConfidence;
  score: number;
} => {
  const schemaType = schemaTypes(schema ?? {})[0];
  if (schemaType) {
    return {
      category: schemaType.replace(/([a-z])([A-Z])/g, "$1 $2"),
      industry: schemaType.includes("LocalBusiness") ? "Local Business" : "Business Services",
      source: "schema.org @type",
      confidence: "VERIFIED",
      score: 0.88,
    };
  }

  const text = [
    crawl.title,
    crawl.meta.description,
    crawl.meta.keywords,
    crawl.headings.h1.join(" "),
    crawl.bodyText.slice(0, 2_500),
  ]
    .filter(Boolean)
    .join(" ");

  for (const rule of categoryRules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return {
        category: rule.category,
        industry: rule.industry,
        source: "page copy heuristic",
        confidence: "ESTIMATED",
        score: 0.68,
      };
    }
  }

  return {
    category: "Local Business",
    industry: "Business Services",
    source: "default market heuristic",
    confidence: "ESTIMATED",
    score: 0.45,
  };
};

export const detectBusiness = (crawl: CrawlResult): BusinessDetection => {
  const schema = findBusinessSchema(crawl);
  const evidence: string[] = [];
  const nameFromSchema = clean(schema?.name) ?? clean(schema?.legalName);
  const organizationName = nameFromSchema ?? crawl.contact.businessNameCandidates[0] ?? null;

  if (nameFromSchema) evidence.push("Business name found in structured data.");
  if (crawl.contact.phones.length > 0) evidence.push("Phone number found on page.");
  if (crawl.contact.emails.length > 0) evidence.push("Email address found on page.");
  if (crawl.contact.addressCandidates.length > 0) evidence.push("Address-like text found on page.");

  const category = inferCategory(crawl, schema);
  const description =
    clean(schema?.description) ??
    crawl.meta.description ??
    crawl.openGraph.description ??
    (crawl.bodyText ? `${crawl.bodyText.slice(0, 180).trim()}...` : null);
  const addressParts = parseAddressObject(schema, crawl.contact.addressCandidates[0]);
  const addressConfidence: DataConfidence = addressParts.formatted
    ? schema?.address
      ? "VERIFIED"
      : "ESTIMATED"
    : "ESTIMATED";
  const addressSource = schema?.address ? "schema.org address" : "address text heuristic";
  const social = {
    ...emptySocialLinks(),
    ...crawl.contact.socialLinks,
  };
  const socialCount = Object.values(social).reduce((total, links) => total + links.length, 0);

  const companyType =
    schemaTypes(schema ?? {}).find((type) => !/^Thing$/i.test(type)) ??
    (category.category === "Local Business" ? "Local business" : `${category.category} company`);

  return {
    confidence: nameFromSchema || organizationName ? "VERIFIED" : "ESTIMATED",
    businessName: field(
      organizationName,
      nameFromSchema ? "VERIFIED" : organizationName ? "ESTIMATED" : "ESTIMATED",
      nameFromSchema ? 0.92 : organizationName ? 0.7 : 0.2,
      nameFromSchema ? "schema.org name" : "title/open graph candidate",
    ),
    organization: field(
      organizationName,
      nameFromSchema ? "VERIFIED" : organizationName ? "ESTIMATED" : "ESTIMATED",
      nameFromSchema ? 0.9 : organizationName ? 0.64 : 0.2,
      nameFromSchema ? "schema.org organization" : "page metadata",
    ),
    category: field(
      category.category,
      category.confidence,
      category.score,
      category.source,
    ),
    industry: field(
      category.industry,
      category.confidence,
      Math.max(0.4, category.score - 0.05),
      category.source,
    ),
    description: field(
      description,
      clean(schema?.description) ? "VERIFIED" : description ? "ESTIMATED" : "ESTIMATED",
      clean(schema?.description) ? 0.86 : description ? 0.62 : 0.2,
      clean(schema?.description) ? "schema.org description" : "meta/body copy",
    ),
    phone: field(
      clean(schema?.telephone) ?? crawl.contact.phones[0] ?? null,
      clean(schema?.telephone) || crawl.contact.phones[0] ? "VERIFIED" : "ESTIMATED",
      clean(schema?.telephone) ? 0.92 : crawl.contact.phones[0] ? 0.78 : 0.1,
      clean(schema?.telephone) ? "schema.org telephone" : "page contact extraction",
    ),
    email: field(
      clean(schema?.email) ?? crawl.contact.emails[0] ?? null,
      clean(schema?.email) || crawl.contact.emails[0] ? "VERIFIED" : "ESTIMATED",
      clean(schema?.email) ? 0.92 : crawl.contact.emails[0] ? 0.78 : 0.1,
      clean(schema?.email) ? "schema.org email" : "page contact extraction",
    ),
    address: {
      street: field(addressParts.street ?? null, addressConfidence, addressParts.street ? 0.78 : 0.1, addressSource),
      city: field(addressParts.city ?? null, addressConfidence, addressParts.city ? 0.72 : 0.1, addressSource),
      region: field(addressParts.region ?? null, addressConfidence, addressParts.region ? 0.7 : 0.1, addressSource),
      postalCode: field(addressParts.postalCode ?? null, addressConfidence, addressParts.postalCode ? 0.7 : 0.1, addressSource),
      country: field(addressParts.country ?? null, addressConfidence, addressParts.country ? 0.68 : 0.1, addressSource),
      formatted: field(addressParts.formatted ?? null, addressConfidence, addressParts.formatted ? 0.78 : 0.1, addressSource),
    },
    socialAccounts: field(
      social,
      socialCount > 0 ? "VERIFIED" : "ESTIMATED",
      socialCount > 0 ? 0.84 : 0.18,
      socialCount > 0 ? "page social links" : "no social links detected",
    ),
    companyType: field(
      companyType,
      schemaTypes(schema ?? {}).length > 0 ? "VERIFIED" : "ESTIMATED",
      schemaTypes(schema ?? {}).length > 0 ? 0.84 : 0.58,
      schemaTypes(schema ?? {}).length > 0 ? "schema.org @type" : "category heuristic",
    ),
    evidence,
  };
};

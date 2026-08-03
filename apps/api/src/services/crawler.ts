import axios, { type AxiosResponse } from "axios";
import * as cheerio from "cheerio";

import { extractDomain, normalizeUrl } from "../utils/url.js";

export type DataConfidence = "VERIFIED" | "ESTIMATED" | "AI_GENERATED";

export interface RedirectStep {
  from: string;
  to: string;
  statusCode: number;
}

export interface HeadingMap {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

export interface CrawlLink {
  href: string;
  text: string;
  title?: string;
  rel?: string;
  isInternal: boolean;
  nofollow: boolean;
}

export interface CrawlImage {
  src: string;
  alt?: string;
  title?: string;
  loading?: string;
  width?: string;
  height?: string;
}

export interface ResourceCheck {
  url: string;
  exists: boolean;
  statusCode?: number;
  confidence: DataConfidence;
}

export interface SocialLinks {
  facebook: string[];
  instagram: string[];
  linkedin: string[];
  twitter: string[];
  youtube: string[];
  pinterest: string[];
}

export interface CrawlResult {
  success: boolean;
  requestedUrl: string;
  normalizedUrl: string;
  finalUrl: string;
  domain: string;
  fetchedAt: string;
  statusCode?: number;
  contentType?: string;
  pageSizeBytes: number;
  redirectChain: RedirectStep[];
  redirectChainLength: number;
  isHttps: boolean;
  title?: string;
  meta: {
    description?: string;
    keywords?: string;
    robots?: string;
    canonical?: string;
    viewport?: string;
    charset?: string;
    lang?: string;
  };
  openGraph: Record<string, string>;
  twitterCards: Record<string, string>;
  headings: HeadingMap;
  links: {
    all: CrawlLink[];
    internal: CrawlLink[];
    external: CrawlLink[];
  };
  images: CrawlImage[];
  schemaOrg: Array<Record<string, unknown>>;
  robotsTxt: ResourceCheck;
  sitemapXml: ResourceCheck;
  contact: {
    emails: string[];
    phones: string[];
    socialLinks: SocialLinks;
    addressCandidates: string[];
    businessNameCandidates: string[];
  };
  bodyText: string;
  wordCount: number;
  errors: string[];
}

const USER_AGENT =
  "SEO Vision AI Bot/1.0 (+https://seovision.ai; Website SEO analysis)";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 7;

const emptyHeadings = (): HeadingMap => ({
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
});

const emptySocialLinks = (): SocialLinks => ({
  facebook: [],
  instagram: [],
  linkedin: [],
  twitter: [],
  youtube: [],
  pinterest: [],
});

const uniq = <T>(values: T[]): T[] => Array.from(new Set(values));

const cleanText = (value: string | undefined | null): string | undefined => {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
};

const absoluteUrl = (value: string | undefined, baseUrl: string): string | undefined => {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
};

interface FetchHtmlResult {
  html: string;
  finalUrl: string;
  statusCode?: number;
  contentType?: string;
  pageSizeBytes: number;
  redirectChain: RedirectStep[];
  errors: string[];
}

const responseBodyToString = (data: unknown): string => {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (data === undefined || data === null) return "";
  return String(data);
};

const fetchHtmlFollowingRedirects = async (startUrl: string): Promise<FetchHtmlResult> => {
  const redirectChain: RedirectStep[] = [];
  const errors: string[] = [];
  let currentUrl = startUrl;

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    try {
      const response: AxiosResponse = await axios.get(currentUrl, {
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        responseType: "text",
        transformResponse: [(data) => data],
        validateStatus: () => true,
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const statusCode = response.status;
      const location = response.headers.location;
      if (
        statusCode >= 300 &&
        statusCode < 400 &&
        typeof location === "string" &&
        attempt < MAX_REDIRECTS
      ) {
        const nextUrl = new URL(location, currentUrl).toString();
        redirectChain.push({ from: currentUrl, to: nextUrl, statusCode });
        currentUrl = nextUrl;
        continue;
      }

      if (statusCode >= 300 && statusCode < 400 && typeof location === "string") {
        errors.push(`Redirect limit reached before ${location}.`);
      }

      const html = responseBodyToString(response.data);
      return {
        html,
        finalUrl: currentUrl,
        statusCode,
        contentType:
          typeof response.headers["content-type"] === "string"
            ? response.headers["content-type"]
            : undefined,
        pageSizeBytes: Buffer.byteLength(html, "utf8"),
        redirectChain,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown crawl error";
      return {
        html: "",
        finalUrl: currentUrl,
        pageSizeBytes: 0,
        redirectChain,
        errors: [`Failed to fetch ${currentUrl}: ${message}`],
      };
    }
  }

  return {
    html: "",
    finalUrl: currentUrl,
    pageSizeBytes: 0,
    redirectChain,
    errors: ["Redirect loop detected."],
  };
};

const checkResource = async (url: string): Promise<ResourceCheck> => {
  const requestConfig = {
    timeout: 7_500,
    maxRedirects: 3,
    validateStatus: () => true,
    headers: { "User-Agent": USER_AGENT },
  };

  try {
    const head = await axios.head(url, requestConfig);
    if (head.status !== 405 && head.status !== 501) {
      return {
        url,
        exists: head.status >= 200 && head.status < 400,
        statusCode: head.status,
        confidence: "VERIFIED",
      };
    }
  } catch {
    // Some hosts block HEAD; a lightweight GET below gives a better signal.
  }

  try {
    const get = await axios.get(url, {
      ...requestConfig,
      responseType: "text",
      transformResponse: [(data) => data],
    });
    return {
      url,
      exists: get.status >= 200 && get.status < 400,
      statusCode: get.status,
      confidence: "VERIFIED",
    };
  } catch (error) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
    return {
      url,
      exists: false,
      statusCode,
      confidence: "VERIFIED",
    };
  }
};

const getMetaContent = (
  $: cheerio.CheerioAPI,
  selector: string,
): string | undefined => cleanText($(selector).first().attr("content"));

const extractMetaRecords = (
  $: cheerio.CheerioAPI,
  prefix: "og:" | "twitter:",
): Record<string, string> => {
  const records: Record<string, string> = {};
  $(`meta[property^="${prefix}"], meta[name^="${prefix}"]`).each((_, element) => {
    const node = $(element);
    const key = node.attr("property") ?? node.attr("name");
    const content = cleanText(node.attr("content"));
    if (key && content) {
      records[key.replace(prefix, "")] = content;
    }
  });
  return records;
};

const parseJsonLd = ($: cheerio.CheerioAPI): Array<Record<string, unknown>> => {
  const items: Array<Record<string, unknown>> = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          items.push(candidate as Record<string, unknown>);
        }
      }
    } catch {
      const repaired = raw.replace(/,\s*([}\]])/g, "$1");
      try {
        const parsed = JSON.parse(repaired) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          items.push(parsed as Record<string, unknown>);
        }
      } catch {
        // Invalid JSON-LD is ignored but the rest of the crawl remains useful.
      }
    }
  });
  return items;
};

const extractEmails = ($: cheerio.CheerioAPI, bodyText: string): string[] => {
  const values: string[] = [];
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr("href");
    const email = href?.replace(/^mailto:/i, "").split("?")[0];
    if (email) values.push(email.toLowerCase());
  });

  const matches = bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  values.push(...matches.map((email) => email.toLowerCase()));
  return uniq(values).slice(0, 20);
};

const extractPhones = ($: cheerio.CheerioAPI, bodyText: string): string[] => {
  const values: string[] = [];
  $('a[href^="tel:"]').each((_, element) => {
    const href = $(element).attr("href");
    const phone = href?.replace(/^tel:/i, "").trim();
    if (phone) values.push(phone);
  });

  const matches =
    bodyText.match(
      /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g,
    ) ?? [];
  values.push(...matches.map((phone) => phone.replace(/\s+/g, " ").trim()));
  return uniq(values).slice(0, 20);
};

const detectSocialPlatform = (href: string): keyof SocialLinks | undefined => {
  const host = new URL(href).hostname.replace(/^www\./, "").toLowerCase();
  if (host.includes("facebook.com")) return "facebook";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("twitter.com") || host === "x.com") return "twitter";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("pinterest.com")) return "pinterest";
  return undefined;
};

const extractAddressCandidates = (
  bodyText: string,
  schemaOrg: Array<Record<string, unknown>>,
): string[] => {
  const candidates: string[] = [];

  for (const item of schemaOrg) {
    const address = item.address;
    if (typeof address === "string") {
      candidates.push(address);
    } else if (address && typeof address === "object") {
      const addressRecord = address as Record<string, unknown>;
      const parts = [
        addressRecord.streetAddress,
        addressRecord.addressLocality,
        addressRecord.addressRegion,
        addressRecord.postalCode,
        addressRecord.addressCountry,
      ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
      if (parts.length > 0) candidates.push(parts.join(", "));
    }
  }

  const lines = bodyText
    .split(/\n| {3,}/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const streetPattern =
    /\b(\d{1,6}\s+[\w\s.-]{3,80}\s(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|suite|ste)\b[^.]{0,80})/i;

  for (const line of lines) {
    const match = line.match(streetPattern);
    if (match?.[1]) candidates.push(match[1].trim());
  }

  return uniq(candidates).slice(0, 10);
};

const extractBusinessNameCandidates = (
  title: string | undefined,
  openGraph: Record<string, string>,
  schemaOrg: Array<Record<string, unknown>>,
): string[] => {
  const candidates: string[] = [];
  const siteName = openGraph.site_name;
  if (siteName) candidates.push(siteName);

  for (const item of schemaOrg) {
    if (typeof item.name === "string") candidates.push(item.name);
    if (typeof item.legalName === "string") candidates.push(item.legalName);
  }

  if (title) {
    const titleCandidate = title.split(/\s[|-]\s| - | \| /)[0]?.trim();
    if (titleCandidate) candidates.push(titleCandidate);
  }

  return uniq(candidates.map((candidate) => candidate.trim()).filter(Boolean)).slice(0, 8);
};

const countWords = (bodyText: string): number => {
  const matches = bodyText.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)?/g);
  return matches?.length ?? 0;
};

export const crawlWebsite = async (url: string): Promise<CrawlResult> => {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL";
    const fallback = url.trim();
    return {
      success: false,
      requestedUrl: url,
      normalizedUrl: fallback,
      finalUrl: fallback,
      domain: "",
      fetchedAt: new Date().toISOString(),
      pageSizeBytes: 0,
      redirectChain: [],
      redirectChainLength: 0,
      isHttps: false,
      meta: {},
      openGraph: {},
      twitterCards: {},
      headings: emptyHeadings(),
      links: { all: [], internal: [], external: [] },
      images: [],
      schemaOrg: [],
      robotsTxt: { url: "", exists: false, confidence: "VERIFIED" },
      sitemapXml: { url: "", exists: false, confidence: "VERIFIED" },
      contact: {
        emails: [],
        phones: [],
        socialLinks: emptySocialLinks(),
        addressCandidates: [],
        businessNameCandidates: [],
      },
      bodyText: "",
      wordCount: 0,
      errors: [message],
    };
  }

  const fetchResult = await fetchHtmlFollowingRedirects(normalizedUrl);
  const finalUrl = fetchResult.finalUrl;
  const domain = extractDomain(finalUrl);
  const origin = new URL(finalUrl).origin;
  const [robotsTxt, sitemapXml] = await Promise.all([
    checkResource(new URL("/robots.txt", origin).toString()),
    checkResource(new URL("/sitemap.xml", origin).toString()),
  ]);

  const $ = cheerio.load(fetchResult.html);
  const title = cleanText($("title").first().text());
  const openGraph = extractMetaRecords($, "og:");
  const twitterCards = extractMetaRecords($, "twitter:");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const schemaOrg = parseJsonLd($);
  const headings = emptyHeadings();

  (["h1", "h2", "h3", "h4", "h5", "h6"] as const).forEach((tag) => {
    $(tag).each((_, element) => {
      const text = cleanText($(element).text());
      if (text) headings[tag].push(text);
    });
  });

  const baseDomain = extractDomain(finalUrl);
  const links: CrawlLink[] = [];
  const socialLinks = emptySocialLinks();
  $("a[href]").each((_, element) => {
    const node = $(element);
    const href = absoluteUrl(node.attr("href"), finalUrl);
    if (!href || !/^https?:\/\//i.test(href)) return;

    const linkDomain = extractDomain(href);
    const rel = cleanText(node.attr("rel"));
    const link: CrawlLink = {
      href,
      text: cleanText(node.text()) ?? "",
      title: cleanText(node.attr("title")),
      rel,
      isInternal: linkDomain === baseDomain,
      nofollow: rel?.toLowerCase().split(/\s+/).includes("nofollow") ?? false,
    };
    links.push(link);

    const platform = detectSocialPlatform(href);
    if (platform) socialLinks[platform].push(href);
  });

  const images: CrawlImage[] = [];
  $("img").each((_, element) => {
    const node = $(element);
    const src = absoluteUrl(node.attr("src") ?? node.attr("data-src"), finalUrl);
    if (!src) return;
    images.push({
      src,
      alt: cleanText(node.attr("alt")),
      title: cleanText(node.attr("title")),
      loading: cleanText(node.attr("loading")),
      width: cleanText(node.attr("width")),
      height: cleanText(node.attr("height")),
    });
  });

  const canonical = absoluteUrl(
    cleanText($('link[rel="canonical"]').first().attr("href")),
    finalUrl,
  );
  const charset =
    cleanText($("meta[charset]").first().attr("charset")) ??
    cleanText($('meta[http-equiv="content-type" i]').first().attr("content"))?.match(
      /charset=([^;]+)/i,
    )?.[1];

  const dedupedSocialLinks = Object.fromEntries(
    Object.entries(socialLinks).map(([platform, urls]) => [platform, uniq(urls).slice(0, 10)]),
  ) as unknown as SocialLinks;

  const internal = links.filter((link) => link.isInternal);
  const external = links.filter((link) => !link.isInternal);

  const contact = {
    emails: extractEmails($, bodyText),
    phones: extractPhones($, bodyText),
    socialLinks: dedupedSocialLinks,
    addressCandidates: extractAddressCandidates(bodyText, schemaOrg),
    businessNameCandidates: extractBusinessNameCandidates(title, openGraph, schemaOrg),
  };

  const statusOk =
    fetchResult.statusCode !== undefined &&
    fetchResult.statusCode >= 200 &&
    fetchResult.statusCode < 400;

  return {
    success: statusOk && fetchResult.errors.length === 0,
    requestedUrl: url,
    normalizedUrl,
    finalUrl,
    domain,
    fetchedAt: new Date().toISOString(),
    statusCode: fetchResult.statusCode,
    contentType: fetchResult.contentType,
    pageSizeBytes: fetchResult.pageSizeBytes,
    redirectChain: fetchResult.redirectChain,
    redirectChainLength: fetchResult.redirectChain.length,
    isHttps: new URL(finalUrl).protocol === "https:",
    title,
    meta: {
      description: getMetaContent($, 'meta[name="description" i]'),
      keywords: getMetaContent($, 'meta[name="keywords" i]'),
      robots: getMetaContent($, 'meta[name="robots" i]'),
      canonical,
      viewport: getMetaContent($, 'meta[name="viewport" i]'),
      charset: cleanText(charset),
      lang: cleanText($("html").first().attr("lang")),
    },
    openGraph,
    twitterCards,
    headings,
    links: {
      all: links,
      internal,
      external,
    },
    images,
    schemaOrg,
    robotsTxt,
    sitemapXml,
    contact,
    bodyText,
    wordCount: countWords(bodyText),
    errors: fetchResult.errors,
  };
};

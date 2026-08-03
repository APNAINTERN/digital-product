export const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
};

export const extractDomain = (input: string): string => {
  const normalized = normalizeUrl(input);
  const hostname = new URL(normalized).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
};

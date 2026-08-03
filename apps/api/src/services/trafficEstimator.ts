import type { DataConfidence } from "./crawler.js";

export interface ChartPoint {
  label: string;
  value: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TrafficEstimate {
  domain: string;
  confidence: DataConfidence;
  generatedAt: string;
  visitors: {
    monthly: number;
    dailyAverage: number;
    weeklyAverage: number;
    returningPercent: number;
  };
  acquisition: {
    organic: number;
    paid: number;
    direct: number;
    referral: number;
    social: number;
    chart: ChartPoint[];
  };
  engagement: {
    bounceRate: number;
    averageSessionDurationSeconds: number;
    pagesPerSession: number;
  };
  geography: {
    topCountries: ChartPoint[];
    topCities: ChartPoint[];
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
    chart: ChartPoint[];
  };
  timing: {
    peakHours: ChartPoint[];
    peakDays: ChartPoint[];
  };
  trends: {
    seasonal: ChartPoint[];
    monthlyVisitors: TimeSeriesPoint[];
  };
}

const hashString = (value: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const rng = (seed: number): (() => number) => {
  let state = seed || 1;
  return () => {
    state = Math.imul(1_664_525, state) + 1_013_904_223;
    return ((state >>> 0) % 10_000) / 10_000;
  };
};

const bounded = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const normalizeDistribution = (
  entries: Array<[string, number]>,
  total = 100,
): ChartPoint[] => {
  const sum = entries.reduce((acc, [, value]) => acc + value, 0) || 1;
  let running = 0;
  return entries.map(([label, value], index) => {
    const normalized =
      index === entries.length - 1
        ? total - running
        : Math.round((value / sum) * total);
    running += normalized;
    return { label, value: normalized };
  });
};

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const estimateTraffic = (domain: string, seoScore: number): TrafficEstimate => {
  const seed = hashString(domain.toLowerCase());
  const random = rng(seed);
  const scoreFactor = 0.45 + Math.max(0, Math.min(100, seoScore)) / 100;
  const authorityFactor = 0.65 + random() * 1.65;
  const marketFactor = 0.8 + random() * 2.4;
  const baseMonthly = bounded(
    (700 + (seed % 45_000)) * scoreFactor * authorityFactor * marketFactor,
    120,
    350_000,
  );

  const organic = bounded(34 + seoScore * 0.32 + random() * 12, 25, 78);
  const paid = bounded(4 + random() * 18 - seoScore * 0.04, 2, 26);
  const direct = bounded(12 + random() * 18, 8, 34);
  const referral = bounded(5 + random() * 12, 3, 18);
  const social = Math.max(2, 100 - organic - paid - direct - referral);
  const acquisitionChart = normalizeDistribution([
    ["Organic", organic],
    ["Paid", paid],
    ["Direct", direct],
    ["Referral", referral],
    ["Social", social],
  ]);

  const mobile = bounded(46 + random() * 24, 38, 74);
  const desktop = bounded(100 - mobile - (5 + random() * 8), 18, 54);
  const tablet = Math.max(3, 100 - mobile - desktop);
  const deviceChart = normalizeDistribution([
    ["Mobile", mobile],
    ["Desktop", desktop],
    ["Tablet", tablet],
  ]);

  const countries = normalizeDistribution([
    ["United States", 28 + random() * 32],
    ["United Kingdom", 8 + random() * 12],
    ["Canada", 6 + random() * 10],
    ["Australia", 4 + random() * 8],
    ["Other", 16 + random() * 20],
  ]);

  const cityPool = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Toronto",
    "London",
    "Sydney",
    "Dallas",
    "Miami",
    "San Francisco",
    "Manchester",
  ];
  const cityStart = seed % (cityPool.length - 4);
  const cities = normalizeDistribution(
    cityPool.slice(cityStart, cityStart + 5).map((city, index) => [
      city,
      22 - index * 3 + random() * 8,
    ]),
    72,
  );

  const peakHours = normalizeDistribution(
    [
      ["9 AM", 14 + random() * 8],
      ["11 AM", 18 + random() * 8],
      ["1 PM", 16 + random() * 8],
      ["3 PM", 20 + random() * 8],
      ["7 PM", 12 + random() * 8],
    ],
    100,
  );

  const peakDays = normalizeDistribution([
    ["Mon", 13 + random() * 4],
    ["Tue", 15 + random() * 4],
    ["Wed", 16 + random() * 4],
    ["Thu", 15 + random() * 4],
    ["Fri", 14 + random() * 4],
    ["Sat", 10 + random() * 4],
    ["Sun", 8 + random() * 4],
  ]);

  const seasonal = monthLabels.map((label, index) => {
    const wave = Math.sin(((index + (seed % 6)) / 12) * Math.PI * 2);
    return {
      label,
      value: bounded(100 + wave * (9 + random() * 8) + random() * 6, 70, 135),
    };
  });

  const today = new Date();
  const monthlyVisitors = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11 + offset, 1));
    const trend = 0.86 + offset * 0.021 + (seoScore - 50) * 0.0015;
    const seasonalMultiplier = seasonal[date.getUTCMonth()]?.value ?? 100;
    return {
      date: date.toISOString().slice(0, 10),
      value: bounded(baseMonthly * trend * (seasonalMultiplier / 100) * (0.94 + random() * 0.12), 50, 500_000),
    };
  });

  const bounceRate = bounded(68 - seoScore * 0.22 + random() * 12, 28, 78);
  const averageSessionDurationSeconds = bounded(55 + seoScore * 1.7 + random() * 95, 45, 420);
  const returningPercent = bounded(14 + seoScore * 0.22 + random() * 18, 8, 46);

  return {
    domain,
    confidence: "ESTIMATED",
    generatedAt: new Date().toISOString(),
    visitors: {
      monthly: baseMonthly,
      dailyAverage: Math.round(baseMonthly / 30),
      weeklyAverage: Math.round(baseMonthly / 4.345),
      returningPercent,
    },
    acquisition: {
      organic: acquisitionChart.find((point) => point.label === "Organic")?.value ?? organic,
      paid: acquisitionChart.find((point) => point.label === "Paid")?.value ?? paid,
      direct: acquisitionChart.find((point) => point.label === "Direct")?.value ?? direct,
      referral: acquisitionChart.find((point) => point.label === "Referral")?.value ?? referral,
      social: acquisitionChart.find((point) => point.label === "Social")?.value ?? social,
      chart: acquisitionChart,
    },
    engagement: {
      bounceRate,
      averageSessionDurationSeconds,
      pagesPerSession: Number((1.4 + (100 - bounceRate) / 34 + random()).toFixed(1)),
    },
    geography: {
      topCountries: countries,
      topCities: cities,
    },
    devices: {
      desktop: deviceChart.find((point) => point.label === "Desktop")?.value ?? desktop,
      mobile: deviceChart.find((point) => point.label === "Mobile")?.value ?? mobile,
      tablet: deviceChart.find((point) => point.label === "Tablet")?.value ?? tablet,
      chart: deviceChart,
    },
    timing: {
      peakHours,
      peakDays,
    },
    trends: {
      seasonal,
      monthlyVisitors,
    },
  };
};

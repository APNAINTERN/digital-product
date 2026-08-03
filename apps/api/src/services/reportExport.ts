import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import type { CompleteAnalysisReport } from "./analysisPipeline.js";

type ReportLike = CompleteAnalysisReport;

const formatPercent = (value: number): string => `${value}%`;

const addPdfSection = (doc: PDFKit.PDFDocument, title: string): void => {
  doc.moveDown(0.8);
  doc.fontSize(15).fillColor("#122033").text(title, { underline: false });
  doc.moveDown(0.3);
  doc.strokeColor("#d9e2ef").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
};

const bulletList = (doc: PDFKit.PDFDocument, items: string[]): void => {
  doc.fontSize(10).fillColor("#2f4054");
  for (const item of items.filter(Boolean).slice(0, 10)) {
    doc.text(`- ${item}`, { indent: 12, lineGap: 2 });
  }
};

export const generatePdfBuffer = async (report: ReportLike): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `SEO Vision AI Report - ${report.input.domain}`,
        Author: "SEO Vision AI",
      },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, 96).fill("#122033");
    doc.fillColor("#ffffff").fontSize(24).text("SEO Vision AI", 50, 32);
    doc.fontSize(12).text(`Website Analysis Report for ${report.input.domain}`, 50, 62);

    doc.moveDown(4);
    doc.fillColor("#122033").fontSize(20).text(report.business.businessName.value ?? report.input.domain);
    doc.fillColor("#52657a").fontSize(10).text(`Generated ${new Date(report.meta.generatedAt).toLocaleString()}`);
    doc.moveDown(0.8);
    doc
      .fontSize(11)
      .fillColor("#2f4054")
      .text(report.ai.executiveSummary, { lineGap: 4 });

    addPdfSection(doc, "Score Summary");
    const scoreRows = [
      ["Overall SEO", report.seo.scores.overall],
      ["Technical", report.seo.scores.technical],
      ["On-page", report.seo.scores.onPage],
      ["Content", report.seo.scores.content],
      ["Images", report.seo.scores.images],
      ["Security", report.seo.scores.security],
      ["Performance", report.seo.coreWebVitals.performanceScore],
    ] as const;
    for (const [label, value] of scoreRows) {
      doc
        .fontSize(11)
        .fillColor("#122033")
        .text(label, { continued: true })
        .fillColor(value >= 75 ? "#15803d" : value >= 55 ? "#b45309" : "#b91c1c")
        .text(`  ${value}/100`);
    }

    addPdfSection(doc, "Top Issues and Fixes");
    for (const item of report.seo.issues.slice(0, 8)) {
      doc.fontSize(11).fillColor("#122033").text(`${item.severity.toUpperCase()}: ${item.title}`);
      doc.fontSize(9).fillColor("#52657a").text(item.description, { lineGap: 2 });
      doc.fontSize(9).fillColor("#2563eb").text(`Suggested fix: ${item.fix.suggested}`);
      doc.moveDown(0.4);
    }

    addPdfSection(doc, "Traffic and Market Estimates");
    doc
      .fontSize(10)
      .fillColor("#2f4054")
      .text(`Estimated monthly visitors: ${report.traffic.visitors.monthly.toLocaleString()}`)
      .text(`Organic share: ${formatPercent(report.traffic.acquisition.organic)}`)
      .text(`Bounce rate: ${formatPercent(report.traffic.engagement.bounceRate)}`)
      .text(`Average session duration: ${report.traffic.engagement.averageSessionDurationSeconds}s`)
      .text(`Estimated backlinks: ${report.backlinks.estimatedBacklinks.toLocaleString()}`);

    addPdfSection(doc, "AI Growth Priorities");
    bulletList(doc, [
      ...report.ai.howToIncreaseTraffic.slice(0, 3),
      ...report.ai.howToIncreaseLeads.slice(0, 3),
      ...report.ai.howToBeatCompetitors.slice(0, 2),
    ]);

    addPdfSection(doc, "30 / 60 / 90 Day Plan");
    for (const phase of report.ai.actionPlan) {
      doc.fontSize(12).fillColor("#122033").text(`${phase.phase}: ${phase.theme}`);
      bulletList(
        doc,
        phase.tasks.map((task) => `${task.priority.toUpperCase()} - ${task.title}`),
      );
      doc.moveDown(0.3);
    }

    doc.moveDown(0.6);
    doc.fontSize(8).fillColor("#6b7c90").text(report.meta.disclaimer, {
      align: "left",
      lineGap: 2,
    });

    doc.end();
  });

const addRows = (
  worksheet: ExcelJS.Worksheet,
  rows: Array<Array<string | number | boolean | null>>,
): void => {
  for (const row of rows) worksheet.addRow(row);
};

export const generateExcelBuffer = async (report: ReportLike): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SEO Vision AI";
  workbook.created = new Date();
  workbook.modified = new Date();

  const overview = workbook.addWorksheet("Overview");
  overview.columns = [
    { header: "Metric", key: "metric", width: 34 },
    { header: "Value", key: "value", width: 80 },
  ];
  addRows(overview, [
    ["Domain", report.input.domain],
    ["Final URL", report.crawl.finalUrl],
    ["Business Name", report.business.businessName.value],
    ["Category", report.business.category.value],
    ["SEO Score", report.seo.scores.overall],
    ["Estimated Monthly Visitors", report.traffic.visitors.monthly],
    ["Estimated Backlinks", report.backlinks.estimatedBacklinks],
    ["Report Confidence Notice", report.meta.disclaimer],
    ["Executive Summary", report.ai.executiveSummary],
  ]);

  const scores = workbook.addWorksheet("Scores");
  scores.columns = [
    { header: "Category", key: "category", width: 24 },
    { header: "Score", key: "score", width: 14 },
    { header: "Confidence", key: "confidence", width: 18 },
  ];
  addRows(scores, [
    ["Overall", report.seo.scores.overall, report.seo.scores.confidence],
    ["Technical", report.seo.scores.technical, "VERIFIED"],
    ["On-page", report.seo.scores.onPage, "VERIFIED"],
    ["Content", report.seo.scores.content, "VERIFIED"],
    ["Images", report.seo.scores.images, "VERIFIED"],
    ["Security", report.seo.scores.security, "VERIFIED"],
    ["Performance", report.seo.coreWebVitals.performanceScore, report.seo.coreWebVitals.confidence],
  ]);

  const issues = workbook.addWorksheet("Issues");
  issues.columns = [
    { header: "Severity", key: "severity", width: 14 },
    { header: "Category", key: "category", width: 18 },
    { header: "Title", key: "title", width: 34 },
    { header: "Current", key: "current", width: 50 },
    { header: "Suggested", key: "suggested", width: 70 },
    { header: "Copy Text", key: "copyText", width: 80 },
  ];
  for (const item of report.seo.issues) {
    issues.addRow([
      item.severity,
      item.category,
      item.title,
      item.fix.current,
      item.fix.suggested,
      item.fix.copyText,
    ]);
  }

  const keywords = workbook.addWorksheet("Keywords");
  keywords.columns = [
    { header: "Keyword", key: "keyword", width: 32 },
    { header: "Estimated Position", key: "position", width: 20 },
    { header: "Estimated Volume", key: "volume", width: 20 },
    { header: "Difficulty", key: "difficulty", width: 14 },
    { header: "Intent", key: "intent", width: 18 },
    { header: "Confidence", key: "confidence", width: 18 },
  ];
  for (const keyword of report.keywordAnalysis.rankingKeywords) {
    keywords.addRow([
      keyword.keyword,
      keyword.estimatedPosition,
      keyword.estimatedMonthlyVolume,
      keyword.difficulty,
      keyword.intent,
      keyword.confidence,
    ]);
  }

  const traffic = workbook.addWorksheet("Traffic");
  traffic.columns = [
    { header: "Section", key: "section", width: 24 },
    { header: "Label", key: "label", width: 28 },
    { header: "Value", key: "value", width: 18 },
    { header: "Confidence", key: "confidence", width: 18 },
  ];
  addRows(traffic, [
    ["Visitors", "Monthly", report.traffic.visitors.monthly, report.traffic.confidence],
    ["Visitors", "Daily Average", report.traffic.visitors.dailyAverage, report.traffic.confidence],
    ["Engagement", "Bounce Rate", report.traffic.engagement.bounceRate, report.traffic.confidence],
    [
      "Engagement",
      "Average Session Duration",
      report.traffic.engagement.averageSessionDurationSeconds,
      report.traffic.confidence,
    ],
  ]);
  for (const point of report.traffic.acquisition.chart) {
    traffic.addRow(["Acquisition", point.label, point.value, report.traffic.confidence]);
  }
  for (const point of report.traffic.devices.chart) {
    traffic.addRow(["Device", point.label, point.value, report.traffic.confidence]);
  }

  const competitors = workbook.addWorksheet("Competitors");
  competitors.columns = [
    { header: "Name", key: "name", width: 34 },
    { header: "Website", key: "website", width: 42 },
    { header: "DA", key: "da", width: 10 },
    { header: "Traffic", key: "traffic", width: 16 },
    { header: "Keywords", key: "keywords", width: 16 },
    { header: "Backlinks", key: "backlinks", width: 16 },
    { header: "Referring Domains", key: "referringDomains", width: 20 },
    { header: "Social Followers", key: "socialFollowers", width: 20 },
  ];
  for (const competitor of report.competitors.competitors) {
    competitors.addRow([
      competitor.name,
      competitor.website,
      competitor.domainAuthority,
      competitor.monthlyTraffic,
      competitor.keywordsCount,
      competitor.backlinks,
      competitor.referringDomains,
      competitor.socialFollowers,
    ]);
  }

  const plan = workbook.addWorksheet("Action Plan");
  plan.columns = [
    { header: "Phase", key: "phase", width: 14 },
    { header: "Theme", key: "theme", width: 42 },
    { header: "Priority", key: "priority", width: 14 },
    { header: "Task", key: "task", width: 70 },
    { header: "Owner", key: "owner", width: 22 },
    { header: "Impact", key: "impact", width: 54 },
  ];
  for (const phase of report.ai.actionPlan) {
    for (const task of phase.tasks) {
      plan.addRow([
        phase.phase,
        phase.theme,
        task.priority,
        task.title,
        task.owner,
        task.expectedImpact,
      ]);
    }
  }

  for (const worksheet of workbook.worksheets) {
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF122033" },
    };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
};

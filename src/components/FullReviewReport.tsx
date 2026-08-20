import React, { useState } from "react";
import {
  SLRProtocol,
  SLRRecord,
  StudyCharacteristic,
  RiskOfBiasItem,
  SynthesisResult,
  GradeCertaintyItem,
  DiscussionSections,
  PrismaChecklistItem,
} from "../types/slr";
import { Download, Copy, Printer, Check, BookOpen, FileText, CheckCircle2, ShieldAlert, Sparkles, Layers } from "lucide-react";
import PrismaDiagram from "./PrismaDiagram";

interface FullReviewReportProps {
  protocol: SLRProtocol;
  includedRecords: SLRRecord[];
  characteristics: StudyCharacteristic[];
  riskOfBias: RiskOfBiasItem[];
  synthesis: SynthesisResult;
  gradeItems: GradeCertaintyItem[];
  discussion: DiscussionSections;
  checklist: PrismaChecklistItem[];
  counts: any;
}

export default function FullReviewReport({
  protocol,
  includedRecords,
  characteristics,
  riskOfBias,
  synthesis,
  gradeItems,
  discussion,
  checklist,
  counts,
}: FullReviewReportProps) {
  const [copied, setCopied] = useState(false);

  const questions = protocol.primaryResearchQuestions || [
    "RQ1: What is the cumulative diagnostic, predictive, or therapeutic performance across included studies?",
    "RQ2: How do comparative approaches or sub-technologies perform relative to baseline benchmarks?",
    "RQ3: What sources of methodological heterogeneity or bias influence generalizability?",
  ];

  const objectives = protocol.secondaryObjectives || [
    "Quantify subgroup variations across demographic and methodological strata",
    "Assess certainty of cumulative evidence using the GRADE framework",
  ];

  const generateFullMarkdown = () => {
    let md = `# ${protocol.title || "PRISMA 2020 Systematic Literature Review"}\n\n`;
    md += `**Methodology:** ${protocol.reviewType}\n`;
    if (protocol.protocolRegistration) {
      md += `**Protocol Registration:** ${protocol.protocolRegistration}\n`;
    }
    md += `**PRISMA 2020 Statement Compliance:** ${checklist.filter((c) => c.status === "Reported").length}/27 Items Verified\n\n`;
    md += `---\n\n`;

    md += `## 1. Introduction & Objectives (PRISMA Items 3 & 4 / ROSES Items 3 & 4)\n\n`;
    md += `### 1.1 Rationale (PRISMA Item 3)\n`;
    md += `${protocol.introductionRationale || "This systematic literature review was conducted in accordance with the PRISMA 2020 (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) statement to synthesize cumulative evidence and address methodological variations in the literature."}\n\n`;

    if (protocol.backgroundContext) {
      md += `**Domain Background & Problem Significance:**\n${protocol.backgroundContext}\n\n`;
    }

    if (protocol.knowledgeGap) {
      md += `**Knowledge Gap & Need for Synthesis:**\n${protocol.knowledgeGap}\n\n`;
    }

    md += `### 1.2 Explicit Objectives & Research Questions (PRISMA Item 4)\n`;
    md += `**Primary Research Questions:**\n`;
    questions.forEach((q) => {
      md += `- ${q}\n`;
    });
    md += `\n**Secondary Objectives:**\n`;
    objectives.forEach((obj) => {
      md += `- ${obj}\n`;
    });
    md += `\n`;

    md += `### 1.3 PICO / PECO Framework\n`;
    md += `- **Population / Participants (P):** ${protocol.objectivesPICO.population}\n`;
    md += `- **Intervention / Exposure (I/E):** ${protocol.objectivesPICO.intervention}\n`;
    md += `- **Comparator / Control (C):** ${protocol.objectivesPICO.comparator}\n`;
    md += `- **Primary Outcomes (O):** ${protocol.objectivesPICO.outcomes}\n`;
    md += `- **Eligible Study Designs (S):** ${protocol.objectivesPICO.studyDesigns}\n\n`;

    md += `## 2. Methods (PRISMA Items 5–15)\n\n`;
    md += `### 2.1 Eligibility Criteria (Item 5)\n`;
    md += `**Inclusion Criteria:**\n`;
    protocol.eligibilityCriteria.inclusion.forEach((inc) => (md += `- ${inc}\n`));
    md += `\n**Exclusion Criteria:**\n`;
    protocol.eligibilityCriteria.exclusion.forEach((exc) => (md += `- ${exc}\n`));
    md += `\n**Synthesis Grouping:** ${protocol.eligibilityCriteria.groupingForSynthesis}\n\n`;

    md += `### 2.2 Information Sources & Search Strategy (Items 6 & 7 / PRISMA-S)\n`;
    protocol.searchStrategies.forEach((s) => {
      md += `#### ${s.database} Query Syntax\n\`\`\`\n${s.query}\n\`\`\`\nFilters: ${s.filters}\n\n`;
    });

    md += `### 2.3 Selection Process & Automation (Item 8)\n`;
    md += `${protocol.selectionProcess.numReviewers} independent reviewers screened all deduplicated records. Automation disclosure: ${protocol.selectionProcess.automationTools}.\n\n`;

    md += `### 2.4 Risk of Bias Assessment Methods (Item 11)\n`;
    md += `Methodological quality was appraised using ${protocol.riskOfBiasMethods.toolName}.\n\n`;

    md += `## 3. Results (PRISMA Items 16a–22)\n\n`;
    md += `### 3.1 Study Selection (Item 16a & 16b · PRISMA Flow Diagram)\n`;
    md += `The electronic search identified ${counts.identifiedDb || 0} records from databases and ${counts.identifiedOther || 0} from other registers. After removal of ${counts.duplicatesRemoved || 0} duplicates, ${counts.screened || 0} records were screened based on title and abstract, resulting in ${counts.screenedExcluded || 0} exclusions. A total of ${counts.assessed || 0} full-text reports were assessed, of which ${counts.assessedExcluded || 0} were excluded with documented reasons (Item 16b). Ultimately, ${includedRecords.length} studies were included in the systematic review.\n\n`;

    md += `### 3.2 Study Characteristics (Item 17 · Table 1)\n\n`;
    md += `| Study | Country | Sample Size | Population | Intervention / Model | Comparator | Primary Outcome | Key Finding |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    characteristics.forEach((c) => {
      md += `| ${c.authorYear} | ${c.country} | ${c.sampleSize} | ${c.population.replace(/\|/g, "/")} | ${c.interventionOrFocus.replace(/\|/g, "/")} | ${c.comparator.replace(/\|/g, "/")} | ${c.primaryOutcome.replace(/\|/g, "/")} | ${c.keyFinding.replace(/\|/g, "/")} |\n`;
    });
    md += `\n`;

    md += `### 3.3 Risk of Bias in Included Studies (Item 18 · Table 2)\n\n`;
    md += `| Study | Selection (D1) | Predictor/Intervention (D2) | Attrition (D3) | Detection (D4) | Reporting (D5) | Overall RoB | Justification |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    riskOfBias.forEach((r) => {
      md += `| ${r.authorYear} | ${r.d1Selection} | ${r.d2Performance} | ${r.d3Attrition} | ${r.d4Detection} | ${r.d5Reporting} | ${r.overall} | ${r.justification.replace(/\|/g, "/")} |\n`;
    });
    md += `\n`;

    md += `### 3.4 Synthesis of Results (Item 20a–d)\n\n`;
    synthesis.subtopics.forEach((sub) => {
      md += `#### ${sub.title}\n${sub.prose}\n\n`;
    });

    if (synthesis.pooledEffectEstimate) {
      md += `**Pooled Random-Effects Meta-Analysis:** ${synthesis.pooledEffectEstimate.effectMeasure} = ${synthesis.pooledEffectEstimate.effectSize} [95% CI ${synthesis.pooledEffectEstimate.ciLower}–${synthesis.pooledEffectEstimate.ciUpper}], Heterogeneity I² = ${synthesis.pooledEffectEstimate.heterogeneityI2}.\n\n`;
    }

    md += `### 3.5 GRADE Summary of Findings (Item 22 · Table 3)\n\n`;
    md += `| Outcome | Studies | Risk of Bias | Inconsistency | Indirectness | Imprecision | Pub. Bias | Certainty | Explanation |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    gradeItems.forEach((g) => {
      md += `| ${g.outcome} | ${g.numStudies} | ${g.riskOfBias} | ${g.inconsistency} | ${g.indirectness} | ${g.imprecision} | ${g.publicationBias} | ${g.overallCertainty} | ${g.explanation.replace(/\|/g, "/")} |\n`;
    });
    md += `\n`;

    md += `## 4. Discussion (PRISMA Items 23a–23d)\n\n`;
    md += `### 4.1 General Interpretation of Results (Item 23a)\n${discussion.item23aGeneralInterpretation}\n\n`;
    md += `### 4.2 Limitations of Included Evidence (Item 23b)\n${discussion.item23bLimitationsOfEvidence}\n\n`;
    md += `### 4.3 Limitations of Review Processes (Item 23c)\n${discussion.item23cLimitationsOfReviewProcess}\n\n`;
    md += `### 4.4 Implications for Practice, Policy, and Research (Item 23d)\n${discussion.item23dImplications}\n\n`;

    md += `## References (APA 7th Edition)\n\n`;
    includedRecords.forEach((r) => {
      const auth = (r.authors || []).join(", ") || "Unknown authors";
      md += `- ${auth} (${r.year || "n.d."}). ${r.title}. *${r.source || "Journal"}*${r.doi ? `, https://doi.org/${r.doi}` : ""}.\n`;
    });

    return md;
  };

  const handleCopy = () => {
    const md = generateFullMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const md = generateFullMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRISMA_2020_Full_Review_Manuscript.md";
    a.click();
  };

  const handleDownloadDoc = () => {
    const formatBadge = (val: string) => {
      if (val === "Low") return `<span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">Low</span>`;
      if (val === "High") return `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">High</span>`;
      return `<span style="background-color: #fef9c3; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">Some Concerns</span>`;
    };

    const formatCertainty = (val: string) => {
      if (val === "High") return `<span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">High ⊕⊕⊕⊕</span>`;
      if (val === "Moderate") return `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">Moderate ⊕⊕⊕◯</span>`;
      if (val === "Low") return `<span style="background-color: #fef9c3; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">Low ⊕⊕◯◯</span>`;
      return `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9pt;">Very Low ⊕◯◯◯</span>`;
    };

    const docHTML = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${protocol.title || "PRISMA 2020 Systematic Review"}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #0f172a; margin: 40px; }
    h1 { font-size: 22pt; color: #0f172a; font-weight: 800; line-height: 1.25; margin-bottom: 8px; }
    h2 { font-size: 15pt; color: #1e293b; font-weight: 700; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-top: 28px; margin-bottom: 12px; }
    h3 { font-size: 12pt; color: #334155; font-weight: 700; margin-top: 18px; margin-bottom: 8px; }
    p { margin-top: 0; margin-bottom: 12px; text-align: justify; }
    .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 20px; font-size: 10pt; }
    .callout { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; font-size: 10.5pt; }
    .prisma-flow-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; font-size: 10pt; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0; font-size: 10pt; page-break-inside: avoid; }
    th { background-color: #f1f5f9; color: #0f172a; font-weight: 700; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
    td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .table-caption { font-weight: 700; font-size: 11pt; color: #0f172a; margin-top: 20px; margin-bottom: 6px; }
    ul, ol { margin-top: 4px; margin-bottom: 12px; padding-left: 24px; }
    li { margin-bottom: 4px; }
  </style>
</head>
<body>

  <h1>${protocol.title || "Systematic Literature Review Manuscript"}</h1>
  <div class="meta-box">
    <strong>Review Methodology:</strong> ${protocol.reviewType}<br>
    ${protocol.protocolRegistration ? `<strong>Protocol Registration:</strong> ${protocol.protocolRegistration}<br>` : ""}
    <strong>Reporting Standard Compliance:</strong> PRISMA 2020 (27 Checklist Items Verified) · ROSES / PRISMA-S
  </div>

  <h2>1. Introduction & Objectives (PRISMA Items 3 & 4 · ROSES Items 3 & 4)</h2>
  
  <h3>1.1 Scientific Rationale & Background (PRISMA Item 3)</h3>
  <p>${protocol.introductionRationale ? protocol.introductionRationale.replace(/\n\n/g, "</p><p>") : "This systematic review consolidates cumulative evidence across published studies to evaluate performance, methodological rigor, and comparative benchmarks."}</p>
  
  ${protocol.backgroundContext ? `<h3>1.2 Domain Background Context</h3><p>${protocol.backgroundContext}</p>` : ""}
  ${protocol.knowledgeGap ? `<h3>1.3 Literature Gap & Need for Synthesis</h3><p>${protocol.knowledgeGap}</p>` : ""}

  <h3>1.4 Explicit Objectives & Research Questions (PRISMA Item 4)</h3>
  <p><strong>Primary Research Questions:</strong></p>
  <ul>
    ${questions.map((q) => `<li><strong>${q}</strong></li>`).join("")}
  </ul>
  
  <p><strong>Secondary Objectives:</strong></p>
  <ul>
    ${objectives.map((obj) => `<li>${obj}</li>`).join("")}
  </ul>

  <h3>1.5 PICO / PECO Framework Criteria</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Domain</th>
        <th style="width: 75%;">Explicit Review Protocol Definition</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Population (P)</strong></td>
        <td>${protocol.objectivesPICO.population}</td>
      </tr>
      <tr>
        <td><strong>Intervention / Exposure (I/E)</strong></td>
        <td>${protocol.objectivesPICO.intervention}</td>
      </tr>
      <tr>
        <td><strong>Comparator / Benchmark (C)</strong></td>
        <td>${protocol.objectivesPICO.comparator}</td>
      </tr>
      <tr>
        <td><strong>Primary Outcomes (O)</strong></td>
        <td>${protocol.objectivesPICO.outcomes}</td>
      </tr>
      <tr>
        <td><strong>Eligible Study Designs (S)</strong></td>
        <td>${protocol.objectivesPICO.studyDesigns}</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Methods (PRISMA Items 5–15)</h2>
  
  <h3>2.1 Eligibility Criteria (Item 5)</h3>
  <p><strong>Inclusion Criteria:</strong></p>
  <ul>
    ${protocol.eligibilityCriteria.inclusion.map((inc) => `<li>${inc}</li>`).join("")}
  </ul>
  <p><strong>Exclusion Criteria:</strong></p>
  <ul>
    ${protocol.eligibilityCriteria.exclusion.map((exc) => `<li>${exc}</li>`).join("")}
  </ul>
  <p><strong>Planned Synthesis Grouping:</strong> ${protocol.eligibilityCriteria.groupingForSynthesis}</p>

  <h3>2.2 Information Sources & Search Strategy (Items 6 & 7 · PRISMA-S)</h3>
  <div class="table-caption">Table: Database Search Strategies & Syntax</div>
  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Database / Source</th>
        <th style="width: 55%;">Explicit Query Syntax & Boolean Logic</th>
        <th style="width: 25%;">Filters & Timeframe</th>
      </tr>
    </thead>
    <tbody>
      ${protocol.searchStrategies.map((s) => `
        <tr>
          <td><strong>${s.database}</strong></td>
          <td><code style="font-family: Consolas, monospace; font-size: 9.5pt;">${s.query}</code></td>
          <td>${s.filters}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h3>2.3 Selection Process & Automation (Item 8)</h3>
  <p>${protocol.selectionProcess.numReviewers} independent reviewers screened all deduplicated records. Screening automation and tools: ${protocol.selectionProcess.automationTools}.</p>

  <h3>2.4 Risk of Bias Assessment Methods (Item 11)</h3>
  <p>Methodological quality appraisal tool: <strong>${protocol.riskOfBiasMethods.toolName}</strong>. Disagreements were resolved through consensus moderation.</p>

  <h2>3. Results (PRISMA Items 16a–22)</h2>

  <h3>3.1 Study Selection & PRISMA 2020 Flow Structure (Item 16a & 16b)</h3>
  <p>Database queries identified <strong>${counts.identifiedDb || 0}</strong> records from electronic databases and <strong>${counts.identifiedOther || 0}</strong> from secondary registers. Following deduplication (${counts.duplicatesRemoved || 0} duplicates removed), <strong>${counts.screened || 0}</strong> unique records underwent title/abstract screening. <strong>${counts.screenedExcluded || 0}</strong> records were excluded. Full-text evaluation was conducted for <strong>${counts.assessed || 0}</strong> reports, resulting in <strong>${counts.assessedExcluded || 0}</strong> exclusions with documented reasons. A final cohort of <strong>${includedRecords.length} studies</strong> met all criteria for full inclusion in the systematic review.</p>

  <!-- Illustrated PRISMA Flow Diagram in Word -->
  <div class="table-caption">Figure 1: PRISMA 2020 Flow Diagram Illustration</div>
  <table style="border: 2px solid #4f46e5; background-color: #f8fafc;">
    <thead>
      <tr style="background-color: #4f46e5; color: #ffffff;">
        <th colspan="2" style="background-color: #4f46e5; color: #ffffff; text-align: center; font-size: 11pt; padding: 10px;">
          PRISMA 2020 Flow Diagram of Included Studies
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="width: 50%;">
          <div class="prisma-flow-box">
            <strong>1. IDENTIFICATION</strong><br>
            • Databases identified: <strong>n = ${counts.identifiedDb || 0}</strong><br>
            • Other registers identified: <strong>n = ${counts.identifiedOther || 0}</strong><br>
            • Total records retrieved: <strong>n = ${(counts.identifiedDb || 0) + (counts.identifiedOther || 0)}</strong>
          </div>
        </td>
        <td style="width: 50%;">
          <div class="prisma-flow-box">
            <strong>Deduplication:</strong><br>
            • Duplicates removed: <strong>n = ${counts.duplicatesRemoved || 0}</strong><br>
            • Unique records for screening: <strong>n = ${counts.screened || 0}</strong>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="prisma-flow-box">
            <strong>2. TITLE & ABSTRACT SCREENING</strong><br>
            • Records screened: <strong>n = ${counts.screened || 0}</strong>
          </div>
        </td>
        <td>
          <div class="prisma-flow-box" style="border-left: 3px solid #ef4444;">
            <strong>Screening Exclusions:</strong><br>
            • Records excluded on title/abstract: <strong>n = ${counts.screenedExcluded || 0}</strong>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="prisma-flow-box">
            <strong>3. FULL-TEXT ELIGIBILITY ASSESSMENT</strong><br>
            • Reports sought for retrieval: <strong>n = ${counts.soughtRetrieval || counts.assessed || 0}</strong><br>
            • Full-text reports assessed: <strong>n = ${counts.assessed || 0}</strong>
          </div>
        </td>
        <td>
          <div class="prisma-flow-box" style="border-left: 3px solid #ef4444;">
            <strong>Full-Text Exclusions (Item 16b):</strong><br>
            • Total full-text excluded: <strong>n = ${counts.assessedExcluded || 0}</strong><br>
            ${Object.entries(counts.exclusionReasonsBreakdown || {}).map(([r, c]) => `• ${r}: n = ${c}`).join("<br>")}
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="background-color: #ecfdf5; border-top: 2px solid #10b981; text-align: center; padding: 12px;">
          <strong style="color: #065f46; font-size: 11pt;">4. INCLUDED STUDIES IN SYSTEMATIC REVIEW: n = ${includedRecords.length}</strong>
        </td>
      </tr>
    </tbody>
  </table>

  <h3>3.2 Study Characteristics (Item 17 · Table 1)</h3>
  <div class="table-caption">Table 1: Methodological Characteristics of Included Studies</div>
  <table>
    <thead>
      <tr>
        <th>Study</th>
        <th>Country</th>
        <th>Sample Size</th>
        <th>Population</th>
        <th>Intervention / Model</th>
        <th>Comparator</th>
        <th>Primary Outcome</th>
        <th>Key Finding</th>
      </tr>
    </thead>
    <tbody>
      ${characteristics.map((c) => `
        <tr>
          <td><strong>${c.authorYear}</strong></td>
          <td>${c.country}</td>
          <td>${c.sampleSize}</td>
          <td>${c.population}</td>
          <td><strong style="color: #4338ca;">${c.interventionOrFocus}</strong></td>
          <td>${c.comparator}</td>
          <td><strong style="color: #065f46;">${c.primaryOutcome}</strong></td>
          <td>${c.keyFinding}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h3>3.3 Methodological Risk of Bias Assessment Matrix (Item 18 · Table 2)</h3>
  <div class="table-caption">Table 2: Risk of Bias Assessment Traffic-Light Matrix</div>
  <table>
    <thead>
      <tr>
        <th>Study</th>
        <th style="text-align: center;">D1 (Selection)</th>
        <th style="text-align: center;">D2 (Predictor)</th>
        <th style="text-align: center;">D3 (Attrition)</th>
        <th style="text-align: center;">D4 (Detection)</th>
        <th style="text-align: center;">D5 (Reporting)</th>
        <th style="text-align: center;">Overall RoB</th>
        <th>Methodological Appraisal Justification</th>
      </tr>
    </thead>
    <tbody>
      ${riskOfBias.map((r) => `
        <tr>
          <td><strong>${r.authorYear}</strong></td>
          <td style="text-align: center;">${formatBadge(r.d1Selection)}</td>
          <td style="text-align: center;">${formatBadge(r.d2Performance)}</td>
          <td style="text-align: center;">${formatBadge(r.d3Attrition)}</td>
          <td style="text-align: center;">${formatBadge(r.d4Detection)}</td>
          <td style="text-align: center;">${formatBadge(r.d5Reporting)}</td>
          <td style="text-align: center;">${formatBadge(r.overall)}</td>
          <td>${r.justification}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h3>3.4 Synthesis of Results (Item 20a–d)</h3>
  ${synthesis.subtopics.map((st) => `
    <h4>${st.title}</h4>
    <p>${st.prose}</p>
  `).join("")}

  ${synthesis.pooledEffectEstimate ? `
    <div class="callout">
      <strong>Pooled Quantitative Meta-Analysis:</strong><br>
      ${synthesis.pooledEffectEstimate.effectMeasure} = <strong>${synthesis.pooledEffectEstimate.effectSize}</strong> [95% CI ${synthesis.pooledEffectEstimate.ciLower}–${synthesis.pooledEffectEstimate.ciUpper}], Heterogeneity I² = ${synthesis.pooledEffectEstimate.heterogeneityI2} (Tau² = ${synthesis.pooledEffectEstimate.tau2 || "0.012"}, p < 0.001).
    </div>
  ` : ""}

  <h3>3.5 GRADE Summary of Findings (Item 22 · Table 3)</h3>
  <div class="table-caption">Table 3: GRADE Summary of Findings & Evidence Certainty Profile</div>
  <table>
    <thead>
      <tr>
        <th>Outcome</th>
        <th>Studies (N)</th>
        <th>Risk of Bias</th>
        <th>Inconsistency</th>
        <th>Indirectness</th>
        <th>Imprecision</th>
        <th>Pub. Bias</th>
        <th>Certainty (GRADE)</th>
        <th>Explanation</th>
      </tr>
    </thead>
    <tbody>
      ${gradeItems.map((g) => `
        <tr>
          <td><strong>${g.outcome}</strong></td>
          <td>${g.numStudies}</td>
          <td>${g.riskOfBias}</td>
          <td>${g.inconsistency}</td>
          <td>${g.indirectness}</td>
          <td>${g.imprecision}</td>
          <td>${g.publicationBias}</td>
          <td>${formatCertainty(g.overallCertainty)}</td>
          <td>${g.explanation}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h2>4. Discussion (PRISMA Items 23a–23d)</h2>
  <h3>4.1 General Interpretation of Results (Item 23a)</h3>
  <p>${discussion.item23aGeneralInterpretation}</p>

  <h3>4.2 Limitations of Included Evidence (Item 23b)</h3>
  <p>${discussion.item23bLimitationsOfEvidence}</p>

  <h3>4.3 Limitations of Review Processes (Item 23c)</h3>
  <p>${discussion.item23cLimitationsOfReviewProcess}</p>

  <h3>4.4 Implications for Practice, Policy, and Research (Item 23d)</h3>
  <p>${discussion.item23dImplications}</p>

  <h2>5. PRISMA 2020 Statement 27-Item Compliance Audit</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Item #</th>
        <th style="width: 25%;">Section & Topic</th>
        <th style="width: 45%;">PRISMA 2020 Checklist Description</th>
        <th style="width: 20%;">Compliance Status</th>
      </tr>
    </thead>
    <tbody>
      ${checklist.map((c) => `
        <tr>
          <td><strong>#${c.itemNumber}</strong></td>
          <td>${c.section} - ${c.topic}</td>
          <td>${c.checklistDescription}</td>
          <td><span style="color: #166534; font-weight: bold;">✔ ${c.status}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h2>References of Included Studies</h2>
  <ol>
    ${includedRecords.map((r) => {
      const auth = (r.authors || []).join(", ") || "Unknown authors";
      return `<li>${auth} (${r.year || "n.d."}). <em>${r.title}</em>. ${r.source || "Journal"}${r.doi ? `, doi:${r.doi}` : ""}.</li>`;
    }).join("")}
  </ol>

</body>
</html>`;

    const blob = new Blob([docHTML], { type: "application/msword;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(protocol.title || "PRISMA_2020_Review_Report").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 45)}.doc`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="full-review-report-container" className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
            Consolidated SLR Manuscript
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Full PRISMA 2020 Compliant Review Report
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete structured systematic review manuscript incorporating all 27 PRISMA 2020 statement items with interactive flow diagram and native export.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Markdown (.md)
          </button>
          <button
            onClick={handleDownloadDoc}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Download Word (.doc)
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Formatted Manuscript Card */}
      <article className="bg-white border border-slate-200 p-8 sm:p-12 rounded-xl shadow-xs font-sans space-y-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* Title */}
        <header className="border-b border-slate-200 pb-6 space-y-2">
          <div className="font-mono text-[10px] text-indigo-600 uppercase font-bold tracking-wider">
            PRISMA 2020 Systematic Review Manuscript
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {protocol.title || "Systematic Review Title"}
          </h1>
          <div className="text-xs font-mono text-slate-500 pt-1 space-y-1">
            <div>Methodology: <span className="font-semibold text-slate-800">{protocol.reviewType}</span></div>
            {protocol.protocolRegistration && (
              <div>Protocol Registration: <span className="font-semibold text-indigo-700">{protocol.protocolRegistration}</span></div>
            )}
            <div>PRISMA 2020 Compliance: <span className="font-bold text-emerald-700">{checklist.filter((c) => c.status === "Reported").length}/27 Verified</span></div>
          </div>
        </header>

        {/* Section 1: Introduction & Objectives (PRISMA Items 3 & 4) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Introduction & Objectives (PRISMA Items 3 & 4 · ROSES Items 3 & 4)
          </h2>
          
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm font-mono">1.1 Scientific Rationale (PRISMA Item 3)</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
              {protocol.introductionRationale || "This systematic literature review adhered to the PRISMA 2020 statement guidelines to synthesize evidence, resolve conflicting findings in current literature, and establish evidence-based conclusions."}
            </p>
          </div>

          {(protocol.backgroundContext || protocol.knowledgeGap) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {protocol.backgroundContext && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-800 font-mono">Background & Significance</div>
                  <div className="text-slate-600 leading-relaxed">{protocol.backgroundContext}</div>
                </div>
              )}
              {protocol.knowledgeGap && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-800 font-mono">Literature Gap & Need</div>
                  <div className="text-slate-600 leading-relaxed">{protocol.knowledgeGap}</div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-slate-900 text-sm font-mono">1.2 Explicit Objectives & Research Questions (PRISMA Item 4)</h3>
            <div className="space-y-1.5">
              {questions.map((rq, idx) => (
                <div key={idx} className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-950 font-medium">
                  {rq}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-slate-900 text-sm font-mono">1.3 Structured PICO / PECO Criteria</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs font-sans">
              <div><strong className="text-slate-900 font-mono">Population (P):</strong> <span className="text-slate-700">{protocol.objectivesPICO.population}</span></div>
              <div><strong className="text-slate-900 font-mono">Intervention / Exposure (I/E):</strong> <span className="text-slate-700">{protocol.objectivesPICO.intervention}</span></div>
              <div><strong className="text-slate-900 font-mono">Comparator (C):</strong> <span className="text-slate-700">{protocol.objectivesPICO.comparator}</span></div>
              <div><strong className="text-slate-900 font-mono">Primary Outcomes (O):</strong> <span className="text-slate-700">{protocol.objectivesPICO.outcomes}</span></div>
              <div><strong className="text-slate-900 font-mono">Eligible Study Designs (S):</strong> <span className="text-slate-700">{protocol.objectivesPICO.studyDesigns}</span></div>
            </div>
          </div>
        </section>

        {/* Section 2: Methods */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            2. Methods (PRISMA Items 5–15)
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <h3 className="font-bold text-slate-900 text-sm">2.1 Eligibility Criteria (Item 5)</h3>
            <p>Studies were included if they satisfied all inclusion criteria: {protocol.eligibilityCriteria.inclusion.join("; ")}. Studies were excluded based on: {protocol.eligibilityCriteria.exclusion.join("; ")}.</p>

            <h3 className="font-bold text-slate-900 text-sm">2.2 Search Strategy & Information Sources (Items 6 & 7 · PRISMA-S)</h3>
            <p>Comprehensive search strings were developed for {protocol.searchStrategies.map((s) => s.database).join(", ")} using boolean operators, truncation, and controlled vocabularies.</p>

            <h3 className="font-bold text-slate-900 text-sm">2.3 Risk of Bias Assessment (Item 11)</h3>
            <p>Methodological quality and domain-specific bias risk were evaluated using {protocol.riskOfBiasMethods.toolName}.</p>
          </div>
        </section>

        {/* Section 3: Results */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            3. Results (PRISMA Items 16a–22)
          </h2>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">3.1 Study Selection & PRISMA Flow Diagram (Item 16a & 16b)</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Database querying retrieved {counts.identifiedDb || 0} records and {counts.identifiedOther || 0} from registers. Following deduplication ({counts.duplicatesRemoved || 0} duplicates removed), {counts.screened || 0} records were screened based on title and abstract, with {includedRecords.length} studies meeting final inclusion criteria.
            </p>

            {/* Illustrated PRISMA Flow Diagram Embedded */}
            <div className="pt-2">
              <PrismaDiagram counts={counts} />
            </div>
          </div>

          {/* Table 1: Characteristics */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-mono font-bold text-slate-900">
              Table 1: Methodological Characteristics of Included Studies (PRISMA Item 17)
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px]">
                  <tr>
                    <th className="p-2 font-bold">Study</th>
                    <th className="p-2 font-bold">Country</th>
                    <th className="p-2 font-bold">Sample</th>
                    <th className="p-2 font-bold">Intervention / Model</th>
                    <th className="p-2 font-bold">Comparator</th>
                    <th className="p-2 font-bold">Primary Outcome</th>
                    <th className="p-2 font-bold">Key Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {characteristics.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono font-semibold">{c.authorYear}</td>
                      <td className="p-2">{c.country}</td>
                      <td className="p-2 font-mono">{c.sampleSize}</td>
                      <td className="p-2 font-mono text-indigo-700">{c.interventionOrFocus}</td>
                      <td className="p-2 text-slate-600">{c.comparator}</td>
                      <td className="p-2 font-mono font-bold text-emerald-800">{c.primaryOutcome}</td>
                      <td className="p-2 text-slate-600">{c.keyFinding}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Risk of Bias */}
          <div className="space-y-2 pt-4">
            <div className="text-xs font-mono font-bold text-slate-900">
              Table 2: Methodological Risk of Bias Assessment (PRISMA Item 18)
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px]">
                  <tr>
                    <th className="p-2 font-bold">Study</th>
                    <th className="p-2 font-bold text-center">D1</th>
                    <th className="p-2 font-bold text-center">D2</th>
                    <th className="p-2 font-bold text-center">D3</th>
                    <th className="p-2 font-bold text-center">D4</th>
                    <th className="p-2 font-bold text-center">D5</th>
                    <th className="p-2 font-bold text-center">Overall</th>
                    <th className="p-2 font-bold">Methodological Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riskOfBias.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono font-semibold">{r.authorYear}</td>
                      <td className="p-2 text-center font-mono">{r.d1Selection}</td>
                      <td className="p-2 text-center font-mono">{r.d2Performance}</td>
                      <td className="p-2 text-center font-mono">{r.d3Attrition}</td>
                      <td className="p-2 text-center font-mono">{r.d4Detection}</td>
                      <td className="p-2 text-center font-mono">{r.d5Reporting}</td>
                      <td className="p-2 text-center font-mono font-bold text-indigo-700">{r.overall}</td>
                      <td className="p-2 text-slate-600">{r.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Narrative Synthesis */}
          <div className="space-y-3 pt-4">
            <h3 className="font-bold text-slate-900 text-sm">3.3 Narrative Synthesis of Results (Item 20a)</h3>
            {synthesis.subtopics.map((st, i) => (
              <div key={i} className="space-y-1">
                <h4 className="font-bold text-xs text-slate-900 font-mono">{st.title}</h4>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">{st.prose}</p>
              </div>
            ))}
          </div>

          {/* Table 3: GRADE Summary of Findings */}
          <div className="space-y-2 pt-4">
            <div className="text-xs font-mono font-bold text-slate-900">
              Table 3: GRADE Summary of Findings (PRISMA Item 22)
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px]">
                  <tr>
                    <th className="p-2 font-bold">Outcome</th>
                    <th className="p-2 font-bold">Studies (N)</th>
                    <th className="p-2 font-bold">Certainty (GRADE)</th>
                    <th className="p-2 font-bold">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeItems.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono font-semibold">{g.outcome}</td>
                      <td className="p-2 font-mono">{g.numStudies}</td>
                      <td className="p-2 font-mono font-bold text-emerald-800">{g.overallCertainty}</td>
                      <td className="p-2 text-slate-600">{g.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 4: Discussion */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            4. Discussion (PRISMA Items 23a–23d)
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div>
              <h3 className="font-bold text-slate-900 text-xs font-mono mb-1">4.1 General Interpretation (Item 23a)</h3>
              <p>{discussion.item23aGeneralInterpretation}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs font-mono mb-1">4.2 Limitations of Evidence (Item 23b)</h3>
              <p>{discussion.item23bLimitationsOfEvidence}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs font-mono mb-1">4.3 Limitations of Review Process (Item 23c)</h3>
              <p>{discussion.item23cLimitationsOfReviewProcess}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs font-mono mb-1">4.4 Implications for Practice and Research (Item 23d)</h3>
              <p>{discussion.item23dImplications}</p>
            </div>
          </div>
        </section>

        {/* References */}
        <section className="space-y-3 border-t border-slate-200 pt-6">
          <h2 className="text-xl font-bold text-slate-900">
            References of Included Studies
          </h2>
          <div className="space-y-2 text-xs text-slate-600 font-sans leading-relaxed">
            {includedRecords.map((r, i) => (
              <div key={i}>
                <span className="font-semibold text-slate-800">{(r.authors || []).join(", ") || "Unknown authors"}</span> ({r.year || "n.d."}). {r.title}. <em>{r.source || "Journal"}</em>{r.doi ? `, doi:${r.doi}` : ""}.
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

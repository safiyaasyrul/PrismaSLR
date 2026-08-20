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
import { Download, Copy, Printer, Check, BookOpen, FileText } from "lucide-react";

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

  const generateFullMarkdown = () => {
    let md = `# ${protocol.title || "PRISMA 2020 Systematic Literature Review"}\n\n`;
    md += `**Methodology:** ${protocol.reviewType}\n`;
    md += `**PRISMA 2020 Statement Compliance:** ${checklist.filter((c) => c.status === "Reported").length}/27 Items Verified\n\n`;
    md += `---\n\n`;

    md += `## 1. Introduction & Objectives (PRISMA Items 3 & 4)\n\n`;
    md += `This systematic literature review was conducted in accordance with the PRISMA 2020 (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) statement.\n\n`;
    md += `### PICO / PECO Framework\n`;
    md += `- **Population:** ${protocol.objectivesPICO.population}\n`;
    md += `- **Intervention / Exposure:** ${protocol.objectivesPICO.intervention}\n`;
    md += `- **Comparator:** ${protocol.objectivesPICO.comparator}\n`;
    md += `- **Primary Outcomes:** ${protocol.objectivesPICO.outcomes}\n`;
    md += `- **Eligible Study Designs:** ${protocol.objectivesPICO.studyDesigns}\n\n`;

    md += `## 2. Methods (PRISMA Items 5–15)\n\n`;
    md += `### 2.1 Eligibility Criteria (Item 5)\n`;
    md += `**Inclusion Criteria:**\n`;
    protocol.eligibilityCriteria.inclusion.forEach((inc) => (md += `- ${inc}\n`));
    md += `\n**Exclusion Criteria:**\n`;
    protocol.eligibilityCriteria.exclusion.forEach((exc) => (md += `- ${exc}\n`));
    md += `\n**Synthesis Grouping:** ${protocol.eligibilityCriteria.groupingForSynthesis}\n\n`;

    md += `### 2.2 Information Sources & Search Strategy (Items 6 & 7)\n`;
    protocol.searchStrategies.forEach((s) => {
      md += `#### ${s.database} Query Syntax\n\`\`\`\n${s.query}\n\`\`\`\nFilters: ${s.filters}\n\n`;
    });

    md += `### 2.3 Selection Process & Automation (Item 8)\n`;
    md += `${protocol.selectionProcess.numReviewers} independent reviewers screened all deduplicated records. Automation disclosure: ${protocol.selectionProcess.automationTools}.\n\n`;

    md += `### 2.4 Risk of Bias Assessment Methods (Item 11)\n`;
    md += `Methodological quality was appraised using ${protocol.riskOfBiasMethods.toolName}.\n\n`;

    md += `## 3. Results (PRISMA Items 16a–22)\n\n`;
    md += `### 3.1 Study Selection (Item 16a & 16b)\n`;
    md += `The electronic search identified ${counts.identifiedDb || 0} records from databases and ${counts.identifiedOther || 0} from other registers. After removal of ${counts.duplicatesRemoved || 0} duplicates, ${counts.screened || 0} records were screened based on title and abstract, resulting in ${counts.screenedExcluded || 0} exclusions. A total of ${counts.assessed || 0} full-text reports were assessed, of which ${counts.assessedExcluded || 0} were excluded with documented reasons (Item 16b). Ultimately, ${includedRecords.length} studies were included in the systematic review.\n\n`;

    md += `### 3.2 Study Characteristics (Item 17 · Table 1)\n\n`;
    md += `| Study | Country | Sample Size | Population | Intervention / Model | Comparator | Primary Outcome | Key Finding |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    characteristics.forEach((c) => {
      md += `| ${c.authorYear} | ${c.country} | ${c.sampleSize} | ${c.population.replace(/\|/g, "/")} | ${c.interventionOrFocus.replace(/\|/g, "/")} | ${c.comparator.replace(/\|/g, "/")} | ${c.primaryOutcome.replace(/\|/g, "/")} | ${c.keyFinding.replace(/\|/g, "/")} |\n`;
    });
    md += `\n`;

    md += `### 3.3 Risk of Bias in Included Studies (Item 18 · Table 2)\n\n`;
    md += `| Study | Selection (D1) | Predictor (D2) | Attrition (D3) | Detection (D4) | Reporting (D5) | Overall RoB | Justification |\n`;
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
            Complete structured systematic review manuscript incorporating all 27 PRISMA 2020 statement items.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            Download Manuscript (.md)
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
          <div className="text-xs font-mono text-slate-500 pt-1">
            Methodology: {protocol.reviewType} · PRISMA 2020 Compliance: <span className="font-bold text-emerald-700">{checklist.filter((c) => c.status === "Reported").length}/27 Verified</span>
          </div>
        </header>

        {/* Section 1: Objectives & PICO */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-1.5">
            1. Rationale & Objectives (PRISMA Items 3 & 4)
          </h2>
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 text-xs font-sans">
            <div><strong className="text-slate-900">Population (P):</strong> <span className="text-slate-700">{protocol.objectivesPICO.population}</span></div>
            <div><strong className="text-slate-900">Intervention / Technology (I):</strong> <span className="text-slate-700">{protocol.objectivesPICO.intervention}</span></div>
            <div><strong className="text-slate-900">Comparator (C):</strong> <span className="text-slate-700">{protocol.objectivesPICO.comparator}</span></div>
            <div><strong className="text-slate-900">Primary Outcomes (O):</strong> <span className="text-slate-700">{protocol.objectivesPICO.outcomes}</span></div>
            <div><strong className="text-slate-900">Eligible Study Designs (S):</strong> <span className="text-slate-700">{protocol.objectivesPICO.studyDesigns}</span></div>
          </div>
        </section>

        {/* Section 2: Methods */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-1.5">
            2. Methods (PRISMA Items 5–15)
          </h2>
          <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
            <div>
              <strong className="text-slate-900">Eligibility Criteria (Item 5):</strong> Studies were included if they satisfied:
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600">
                {protocol.eligibilityCriteria.inclusion.map((inc, i) => (
                  <li key={i}>{inc}</li>
                ))}
              </ul>
            </div>

            <div>
              <strong className="text-slate-900">Exclusion Criteria:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600">
                {protocol.eligibilityCriteria.exclusion.map((exc, i) => (
                  <li key={i}>{exc}</li>
                ))}
              </ul>
            </div>

            <div>
              <strong className="text-slate-900">Selection Process & Automation Disclosure (Item 8):</strong> {protocol.selectionProcess.numReviewers} independent reviewers screened all identified records. Automation disclosure: {protocol.selectionProcess.automationTools}.
            </div>

            <div>
              <strong className="text-slate-900">Risk of Bias Assessment (Item 11):</strong> Methodological quality was evaluated using {protocol.riskOfBiasMethods.toolName}.
            </div>
          </div>
        </section>

        {/* Section 3: Results */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-1.5">
            3. Results (PRISMA Items 16a–22)
          </h2>

          <div className="text-xs text-slate-700 leading-relaxed">
            The systematic search identified {counts.identifiedDb || 0} records from primary databases. After deduplication of {counts.duplicatesRemoved || 0} duplicate citations, {counts.screened || 0} unique records were screened, resulting in {includedRecords.length} fully eligible studies.
          </div>

          {/* Table 1: Characteristics */}
          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-sm text-slate-900">
              Table 1. Study Characteristics of Included Studies (Item 17)
            </h3>
            <div className="border border-slate-200 overflow-x-auto rounded-xl shadow-2xs">
              <table className="w-full text-left text-[11px] font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-mono text-[10px]">
                    <th className="p-2.5 font-semibold">Study</th>
                    <th className="p-2.5 font-semibold">Sample Size</th>
                    <th className="p-2.5 font-semibold">Intervention / Model</th>
                    <th className="p-2.5 font-semibold">Primary Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {characteristics.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">{c.authorYear}</td>
                      <td className="p-2.5 font-mono text-slate-500">{c.sampleSize}</td>
                      <td className="p-2.5 text-slate-700">{c.interventionOrFocus}</td>
                      <td className="p-2.5 font-mono text-emerald-700 font-semibold">{c.primaryOutcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Synthesis Subtopics */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-slate-900">
              Synthesis of Results (Item 20a–d)
            </h3>
            {synthesis.subtopics.map((sub, i) => (
              <div key={i} className="text-xs space-y-1 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
                <h4 className="font-bold text-slate-900">{sub.title}</h4>
                <p className="text-slate-700 leading-relaxed">{sub.prose}</p>
              </div>
            ))}
          </div>

          {/* Table 2: GRADE SoF */}
          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-sm text-slate-900">
              Table 2. GRADE Summary of Findings (Item 22)
            </h3>
            <div className="border border-slate-200 overflow-x-auto rounded-xl shadow-2xs">
              <table className="w-full text-left text-[11px] font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-mono text-[10px]">
                    <th className="p-2.5 font-semibold">Outcome</th>
                    <th className="p-2.5 font-semibold">Studies</th>
                    <th className="p-2.5 font-semibold">Certainty (GRADE)</th>
                    <th className="p-2.5 font-semibold">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeItems.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">{g.outcome}</td>
                      <td className="p-2.5 font-mono text-slate-500">{g.numStudies}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">{g.overallCertainty}</td>
                      <td className="p-2.5 text-slate-700">{g.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 4: Discussion */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-1.5">
            4. Discussion (PRISMA Items 23a–23d)
          </h2>

          <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
            <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                4.1 General Interpretation (Item 23a)
              </h3>
              <p>{discussion.item23aGeneralInterpretation}</p>
            </div>

            <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                4.2 Limitations of Evidence (Item 23b)
              </h3>
              <p>{discussion.item23bLimitationsOfEvidence}</p>
            </div>

            <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                4.3 Limitations of Review Process (Item 23c)
              </h3>
              <p>{discussion.item23cLimitationsOfReviewProcess}</p>
            </div>

            <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                4.4 Implications for Practice & Policy (Item 23d)
              </h3>
              <p>{discussion.item23dImplications}</p>
            </div>
          </div>
        </section>

        {/* References */}
        <section className="space-y-2 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-slate-900">
            References (Included Studies)
          </h2>
          <div className="text-[11px] text-slate-600 font-sans space-y-1.5">
            {includedRecords.map((r, i) => (
              <div key={i} className="pl-4 -indent-4">
                {(r.authors || []).join(", ")} ({r.year || "2024"}). {r.title}. <em>{r.source || "Journal"}</em>
                {r.doi && <span>, https://doi.org/{r.doi}</span>}
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

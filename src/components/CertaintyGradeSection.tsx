import React, { useState } from "react";
import { GradeCertaintyItem, SLRRecord, StudyCharacteristic } from "../types/slr";
import { Sparkles, Award, FileSpreadsheet, Download } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface CertaintyGradeSectionProps {
  gradeItems: GradeCertaintyItem[];
  onUpdateGrade: (items: GradeCertaintyItem[]) => void;
  includedRecords: SLRRecord[];
  characteristics: StudyCharacteristic[];
  aiConfig: any;
}

export default function CertaintyGradeSection({
  gradeItems,
  onUpdateGrade,
  includedRecords,
  characteristics,
  aiConfig,
}: CertaintyGradeSectionProps) {
  const [evaluating, setEvaluating] = useState(false);

  const handleAutoGrade = async () => {
    if (includedRecords.length === 0) return;
    setEvaluating(true);

    const prompt = `Following PRISMA 2020 Item 15 (Certainty assessment methods) & Item 22 (Certainty of evidence) using the GRADE framework, assess the certainty of evidence for 3-4 key clinical outcomes from the ${includedRecords.length} included studies.
Studies characteristics:
${JSON.stringify(characteristics)}

For each outcome, evaluate:
- outcome: e.g. "Primary 5-Year Incident Diabetes Discrimination (AUC-ROC)"
- numStudies: e.g. "${includedRecords.length} studies (N = 340,000)"
- riskOfBias: "Not serious" | "Serious" | "Very serious"
- inconsistency: "Not serious" | "Serious" | "Very serious"
- indirectness: "Not serious" | "Serious" | "Very serious"
- imprecision: "Not serious" | "Serious" | "Very serious"
- publicationBias: "Undetected" | "Suspected"
- overallCertainty: "High" | "Moderate" | "Low" | "Very Low"
- importance: "Critical" | "Important"
- explanation: Detailed reason for any downgrading.

Return ONLY a JSON array of objects.`;

    try {
      const text = await callAI(prompt, "You are a senior GRADE working group methodology expert.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateGrade(parsed);
      }
    } catch (e) {
      console.error(e);
    }
    setEvaluating(false);
  };

  const updateField = (idx: number, field: keyof GradeCertaintyItem, val: string) => {
    const updated = [...gradeItems];
    updated[idx] = { ...updated[idx], [field]: val };
    onUpdateGrade(updated);
  };

  const renderGradeSymbols = (rating: string) => {
    switch (rating) {
      case "High":
        return <span className="text-emerald-700 font-bold">⊕⊕⊕⊕ High</span>;
      case "Moderate":
        return <span className="text-amber-700 font-bold">⊕⊕⊕◯ Moderate</span>;
      case "Low":
        return <span className="text-rose-700 font-bold">⊕⊕◯◯ Low</span>;
      default:
        return <span className="text-rose-800 font-bold">⊕◯◯◯ Very Low</span>;
    }
  };

  const exportCSV = () => {
    const headers = [
      "Outcome",
      "No. of Studies & Participants",
      "Risk of Bias",
      "Inconsistency",
      "Indirectness",
      "Imprecision",
      "Publication Bias",
      "Certainty (GRADE)",
      "Importance",
      "Explanation",
    ];
    const rows = gradeItems.map((g) => [
      `"${g.outcome}"`,
      `"${g.numStudies}"`,
      `"${g.riskOfBias}"`,
      `"${g.inconsistency}"`,
      `"${g.indirectness}"`,
      `"${g.imprecision}"`,
      `"${g.publicationBias}"`,
      `"${g.overallCertainty}"`,
      `"${g.importance}"`,
      `"${g.explanation.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRISMA_Table_GRADE_Summary_of_Findings.csv";
    a.click();
  };

  return (
    <div id="certainty-grade-container" className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 15 & 22 · Summary of Findings
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              GRADE Certainty of Evidence Assessment
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Evaluate certainty across 5 downgrading domains (Risk of bias, Inconsistency, Indirectness, Imprecision, Publication bias) for primary review outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGrade}
              disabled={evaluating || includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {evaluating ? "Assessing Certainty..." : "AI Assess GRADE Certainty"}
            </button>
            {gradeItems.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export CSV Table
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GRADE Table */}
      {gradeItems.length === 0 ? (
        <div className="bg-white border border-slate-200 p-10 text-center rounded-xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Award className="w-5 h-5" />
          </div>
          <div className="font-mono text-sm font-semibold text-slate-900">
            No GRADE Summary of Findings Generated Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "AI Assess GRADE Certainty" to generate a complete PRISMA 2020 Item 22 Summary of Findings table with certainty ratings.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-mono text-[11px]">
                  <th className="p-3.5 w-48 font-semibold">Outcome / Measure</th>
                  <th className="p-3.5 w-28 font-semibold">No. of Studies</th>
                  <th className="p-3.5 w-28 text-center font-semibold">Risk of Bias</th>
                  <th className="p-3.5 w-28 text-center font-semibold">Inconsistency</th>
                  <th className="p-3.5 w-28 text-center font-semibold">Indirectness</th>
                  <th className="p-3.5 w-28 text-center font-semibold">Imprecision</th>
                  <th className="p-3.5 w-28 text-center font-semibold">Pub. Bias</th>
                  <th className="p-3.5 w-36 text-center font-semibold">GRADE Certainty</th>
                  <th className="p-3.5 font-semibold">Methodological Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradeItems.map((g, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    {/* Outcome */}
                    <td className="p-3.5 align-top font-bold text-sm text-slate-900">
                      {g.outcome}
                    </td>

                    {/* No of studies */}
                    <td className="p-3.5 align-top font-mono text-xs text-slate-500">
                      {g.numStudies}
                    </td>

                    {/* Risk of Bias */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={g.riskOfBias}
                        onChange={(e) => updateField(i, "riskOfBias", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Not serious">Not serious</option>
                        <option value="Serious">Serious (-1)</option>
                        <option value="Very serious">Very serious (-2)</option>
                      </select>
                    </td>

                    {/* Inconsistency */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={g.inconsistency}
                        onChange={(e) => updateField(i, "inconsistency", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Not serious">Not serious</option>
                        <option value="Serious">Serious (-1)</option>
                        <option value="Very serious">Very serious (-2)</option>
                      </select>
                    </td>

                    {/* Indirectness */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={g.indirectness}
                        onChange={(e) => updateField(i, "indirectness", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Not serious">Not serious</option>
                        <option value="Serious">Serious (-1)</option>
                        <option value="Very serious">Very serious (-2)</option>
                      </select>
                    </td>

                    {/* Imprecision */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={g.imprecision}
                        onChange={(e) => updateField(i, "imprecision", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Not serious">Not serious</option>
                        <option value="Serious">Serious (-1)</option>
                        <option value="Very serious">Very serious (-2)</option>
                      </select>
                    </td>

                    {/* Pub Bias */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={g.publicationBias}
                        onChange={(e) => updateField(i, "publicationBias", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Undetected">Undetected</option>
                        <option value="Suspected">Suspected (-1)</option>
                      </select>
                    </td>

                    {/* GRADE Rating */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={g.overallCertainty}
                        onChange={(e) => updateField(i, "overallCertainty", e.target.value)}
                        className={`w-full text-xs font-mono font-bold p-1.5 border rounded-lg ${
                          g.overallCertainty === "High"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : g.overallCertainty === "Moderate"
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-rose-50 border-rose-300 text-rose-800"
                        }`}
                      >
                        <option value="High">High ⊕⊕⊕⊕</option>
                        <option value="Moderate">Moderate ⊕⊕⊕◯</option>
                        <option value="Low">Low ⊕⊕◯◯</option>
                        <option value="Very Low">Very Low ⊕◯◯◯</option>
                      </select>
                    </td>

                    {/* Explanation */}
                    <td className="p-3.5 align-top text-xs text-slate-700 leading-relaxed">
                      <textarea
                        rows={2}
                        value={g.explanation}
                        onChange={(e) => updateField(i, "explanation", e.target.value)}
                        className="w-full text-xs text-slate-700 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

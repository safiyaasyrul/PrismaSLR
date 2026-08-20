import React, { useState } from "react";
import { SLRRecord, StudyCharacteristic } from "../types/slr";
import { Sparkles, Download, Edit3, Table, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface StudyCharacteristicsTableProps {
  includedRecords: SLRRecord[];
  characteristics: StudyCharacteristic[];
  onUpdateCharacteristics: (chars: StudyCharacteristic[]) => void;
  aiConfig: any;
}

export default function StudyCharacteristicsTable({
  includedRecords,
  characteristics,
  onUpdateCharacteristics,
  aiConfig,
}: StudyCharacteristicsTableProps) {
  const [extracting, setExtracting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAutoExtract = async () => {
    if (includedRecords.length === 0) return;
    setExtracting(true);

    const payload = includedRecords.map((r) => ({
      recordId: r.id,
      title: r.title,
      authors: r.authors,
      year: r.year,
      source: r.source,
      abstract: r.abstract,
    }));

    const prompt = `Following PRISMA 2020 Item 17 (Study Characteristics), extract structured clinical/methodological characteristics for each included study from their abstracts:
1. authorYear: e.g. "Chen et al. (2023)"
2. country: e.g. "United States" or "Not stated"
3. sampleSize: e.g. "N = 124,500"
4. population: e.g. "Adult outpatient EHR cohort"
5. interventionOrFocus: e.g. "XGBoost, Random Forest"
6. comparator: e.g. "Logistic Regression, ADA score"
7. primaryOutcome: e.g. "AUC-ROC 0.892 (95% CI 0.884-0.900)"
8. studyDesign: e.g. "Retrospective multi-center cohort"
9. keyFinding: A 1-sentence synopsis of the main empirical finding.

Studies:
${JSON.stringify(payload)}

Return ONLY a JSON array of objects conforming to the fields above, matching each recordId.`;

    try {
      const text = await callAI(prompt, "You are a senior data extraction specialist for systematic reviews.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateCharacteristics(parsed);
      }
    } catch (e) {
      console.error(e);
    }
    setExtracting(false);
  };

  const handleUpdateRow = (idx: number, field: keyof StudyCharacteristic, val: string) => {
    const updated = [...characteristics];
    updated[idx] = { ...updated[idx], [field]: val };
    onUpdateCharacteristics(updated);
  };

  const exportCSV = () => {
    const headers = [
      "Study (Author, Year)",
      "Country",
      "Sample Size",
      "Population",
      "Intervention / Model",
      "Comparator",
      "Primary Outcome / AUC",
      "Study Design",
      "Key Finding",
    ];
    const rows = characteristics.map((c) => [
      `"${c.authorYear}"`,
      `"${c.country}"`,
      `"${c.sampleSize}"`,
      `"${c.population.replace(/"/g, '""')}"`,
      `"${c.interventionOrFocus.replace(/"/g, '""')}"`,
      `"${c.comparator.replace(/"/g, '""')}"`,
      `"${c.primaryOutcome.replace(/"/g, '""')}"`,
      `"${c.studyDesign.replace(/"/g, '""')}"`,
      `"${c.keyFinding.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRISMA_Table1_Study_Characteristics.csv";
    a.click();
  };

  return (
    <div id="study-characteristics-container" className="space-y-6">
      {/* Header card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Item 17 · Table 1
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Study Characteristics Matrix of Included Studies
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Extract and present participant demographics, sample sizes, interventions, comparators, and primary outcomes for all {includedRecords.length} included studies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoExtract}
              disabled={extracting || includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {extracting ? "Extracting Data..." : "AI Auto-Extract Characteristics"}
            </button>
            {characteristics.length > 0 && (
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

      {/* Table Container */}
      {characteristics.length === 0 ? (
        <div className="bg-white border border-slate-200 p-10 text-center rounded-xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Table className="w-5 h-5" />
          </div>
          <div className="font-mono text-sm font-semibold text-slate-900">
            No Characteristics Extracted Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "AI Auto-Extract Characteristics" above to parse study populations, interventions, sample sizes, and primary outcome statistics from all {includedRecords.length} included abstracts.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-mono text-[11px]">
                  <th className="p-3.5 w-40 font-semibold">Study (Author, Year)</th>
                  <th className="p-3.5 w-28 font-semibold">Country & Design</th>
                  <th className="p-3.5 w-28 font-semibold">Sample Size</th>
                  <th className="p-3.5 w-44 font-semibold">Population / Setting</th>
                  <th className="p-3.5 w-44 font-semibold">Intervention / Model</th>
                  <th className="p-3.5 w-40 font-semibold">Comparator</th>
                  <th className="p-3.5 w-44 font-semibold">Primary Outcome / Metrics</th>
                  <th className="p-3.5 font-semibold">Key Finding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {characteristics.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    {/* Author & Year */}
                    <td className="p-3.5 align-top">
                      <input
                        type="text"
                        value={c.authorYear}
                        onChange={(e) => handleUpdateRow(i, "authorYear", e.target.value)}
                        className="w-full font-bold text-xs text-indigo-700 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Country & Design */}
                    <td className="p-3.5 align-top space-y-1">
                      <input
                        type="text"
                        value={c.country}
                        onChange={(e) => handleUpdateRow(i, "country", e.target.value)}
                        placeholder="Country"
                        className="w-full font-mono text-[11px] text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                      <input
                        type="text"
                        value={c.studyDesign}
                        onChange={(e) => handleUpdateRow(i, "studyDesign", e.target.value)}
                        placeholder="Design"
                        className="w-full text-[10px] text-slate-500 italic bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Sample Size */}
                    <td className="p-3.5 align-top">
                      <input
                        type="text"
                        value={c.sampleSize}
                        onChange={(e) => handleUpdateRow(i, "sampleSize", e.target.value)}
                        className="w-full font-mono text-xs text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Population */}
                    <td className="p-3.5 align-top">
                      <textarea
                        rows={2}
                        value={c.population}
                        onChange={(e) => handleUpdateRow(i, "population", e.target.value)}
                        className="w-full text-xs text-slate-700 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Intervention */}
                    <td className="p-3.5 align-top">
                      <textarea
                        rows={2}
                        value={c.interventionOrFocus}
                        onChange={(e) => handleUpdateRow(i, "interventionOrFocus", e.target.value)}
                        className="w-full text-xs text-slate-900 font-medium bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Comparator */}
                    <td className="p-3.5 align-top">
                      <input
                        type="text"
                        value={c.comparator}
                        onChange={(e) => handleUpdateRow(i, "comparator", e.target.value)}
                        className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Primary Outcome */}
                    <td className="p-3.5 align-top">
                      <textarea
                        rows={2}
                        value={c.primaryOutcome}
                        onChange={(e) => handleUpdateRow(i, "primaryOutcome", e.target.value)}
                        className="w-full font-mono text-[11.5px] text-emerald-700 font-semibold bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white p-0.5 rounded"
                      />
                    </td>

                    {/* Key Finding */}
                    <td className="p-3.5 align-top">
                      <textarea
                        rows={2}
                        value={c.keyFinding}
                        onChange={(e) => handleUpdateRow(i, "keyFinding", e.target.value)}
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

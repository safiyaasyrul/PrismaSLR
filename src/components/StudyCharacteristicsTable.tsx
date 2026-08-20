import React, { useState } from "react";
import { SLRRecord, StudyCharacteristic } from "../types/slr";
import { Sparkles, Download, Edit3, Table, FileSpreadsheet, Plus, Trash2, AlertCircle, RefreshCw, Zap, Check } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface StudyCharacteristicsTableProps {
  includedRecords: SLRRecord[];
  characteristics: StudyCharacteristic[];
  onUpdateCharacteristics: (chars: StudyCharacteristic[]) => void;
  aiConfig: any;
  onNavigateToScreening?: () => void;
}

export default function StudyCharacteristicsTable({
  includedRecords,
  characteristics,
  onUpdateCharacteristics,
  aiConfig,
  onNavigateToScreening,
}: StudyCharacteristicsTableProps) {
  const [extracting, setExtracting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Heuristic rule-based fallback extractor
  const runHeuristicExtraction = () => {
    if (includedRecords.length === 0) return;
    const generated: StudyCharacteristic[] = includedRecords.map((r, idx) => {
      const firstAuthor = r.authors[0] ? r.authors[0].split(",")[0].trim() : "Author";
      const year = r.year || "2024";
      const abstract = r.abstract || "";

      // Regex heuristics for sample size
      const nMatch = abstract.match(/(?:n\s*=\s*|sample\s*of\s*|cohort\s*of\s*|participants\s*=\s*)([0-9,]+)/i);
      const sampleSize = nMatch ? `N = ${nMatch[1]}` : "Cohort / EHR data";

      // Country extraction heuristic
      const countries = ["United States", "China", "UK", "Germany", "Canada", "Australia", "Japan", "Malaysia", "India", "France"];
      const foundCountry = countries.find((c) => abstract.includes(c) || r.source?.includes(c)) || "Multi-center";

      // AUC extraction heuristic
      const aucMatch = abstract.match(/(?:AUC(?:-ROC)?|C-statistic|AUROC)\s*(?:of|=|:)?\s*([0-9]\.[0-9]{2,3})/i);
      const primaryOutcome = aucMatch ? `AUC-ROC ${aucMatch[1]}` : "Reported discrimination / sensitivity";

      return {
        recordId: r.id,
        authorYear: `${firstAuthor} et al. (${year})`,
        country: foundCountry,
        sampleSize,
        population: "Adult target population cohort",
        interventionOrFocus: r.title.slice(0, 70),
        comparator: "Standard statistical / baseline model",
        primaryOutcome,
        studyDesign: "Retrospective validation cohort",
        keyFinding: abstract.slice(0, 140) || r.title,
      };
    });

    onUpdateCharacteristics(generated);
    setErrorMessage(null);
  };

  const handleAutoExtract = async () => {
    if (includedRecords.length === 0) return;
    setExtracting(true);
    setErrorMessage(null);

    const payload = includedRecords.map((r) => ({
      recordId: r.id,
      title: r.title,
      authors: r.authors,
      year: r.year,
      source: r.source,
      abstract: (r.abstract || "").slice(0, 600),
    }));

    const prompt = `Following PRISMA 2020 Item 17 (Study Characteristics), extract structured clinical/methodological characteristics for each included study from their abstracts:
1. recordId: exact string from recordId
2. authorYear: e.g. "Chen et al. (2023)"
3. country: e.g. "United States" or "Not stated"
4. sampleSize: e.g. "N = 124,500"
5. population: e.g. "Adult outpatient cohort"
6. interventionOrFocus: e.g. "XGBoost, Random Forest"
7. comparator: e.g. "Logistic Regression, Standard score"
8. primaryOutcome: e.g. "AUC-ROC 0.892 (95% CI 0.884-0.900)"
9. studyDesign: e.g. "Retrospective multi-center cohort"
10. keyFinding: A 1-sentence synopsis of the main empirical finding.

Studies:
${JSON.stringify(payload)}

Return ONLY a JSON array of objects conforming to the fields above, matching each recordId.`;

    try {
      const text = await callAI(prompt, "You are a senior data extraction specialist for systematic reviews.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateCharacteristics(parsed);
      } else {
        throw new Error("Could not parse AI response as JSON array.");
      }
    } catch (e: any) {
      console.warn("AI extraction error:", e);
      setErrorMessage(`AI Extraction Notice: ${e.message || "Request failed"}. Automatic rule-based extraction was applied as a fallback.`);
      runHeuristicExtraction();
    } finally {
      setExtracting(false);
    }
  };

  const handleUpdateRow = (idx: number, field: keyof StudyCharacteristic, val: string) => {
    const updated = [...characteristics];
    updated[idx] = { ...updated[idx], [field]: val };
    onUpdateCharacteristics(updated);
  };

  const handleAddRow = () => {
    const newRow: StudyCharacteristic = {
      recordId: `custom-${Date.now()}`,
      authorYear: "New Author (2024)",
      country: "United States",
      sampleSize: "N = 5,000",
      population: "Adult study population",
      interventionOrFocus: "Intervention / Predictive Model",
      comparator: "Standard Control",
      primaryOutcome: "Primary Outcome Measure",
      studyDesign: "Cohort Study",
      keyFinding: "Key statistical finding summary",
    };
    onUpdateCharacteristics([...characteristics, newRow]);
  };

  const handleDeleteRow = (idx: number) => {
    const updated = characteristics.filter((_, i) => i !== idx);
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
      `"${c.population?.replace(/"/g, '""') || ""}"`,
      `"${c.interventionOrFocus?.replace(/"/g, '""') || ""}"`,
      `"${c.comparator?.replace(/"/g, '""') || ""}"`,
      `"${c.primaryOutcome?.replace(/"/g, '""') || ""}"`,
      `"${c.studyDesign?.replace(/"/g, '""') || ""}"`,
      `"${c.keyFinding?.replace(/"/g, '""') || ""}"`,
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
      {/* Error / Notice Alert */}
      {errorMessage && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-700 hover:text-amber-900 font-bold">
            ✕
          </button>
        </div>
      )}

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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAutoExtract}
              disabled={extracting || includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {extracting ? "Extracting Data..." : "AI Auto-Extract Characteristics"}
            </button>
            <button
              onClick={runHeuristicExtraction}
              disabled={includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
              title="Instant extraction from abstracts without API latency"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Instant Heuristic Matrix
            </button>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
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

      {/* When no included records are found */}
      {includedRecords.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-sm font-bold text-amber-900">No Studies Currently Marked as Included</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            Table 1 populates from studies that have been included during the Title/Abstract Screening stage.
          </p>
          {onNavigateToScreening && (
            <button
              onClick={onNavigateToScreening}
              className="px-4 py-2 text-xs font-mono font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Go to Title/Abstract Screening Stage
            </button>
          )}
        </div>
      )}

      {/* Table Container */}
      {characteristics.length === 0 && includedRecords.length > 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-xl space-y-4 shadow-xs">
          <Table className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Characteristics Table Not Yet Populated</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You have {includedRecords.length} included studies ready for extraction. Click below to auto-populate Table 1.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleAutoExtract}
              disabled={extracting}
              className="px-4 py-2 text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              {extracting ? "Extracting..." : "Auto-Extract with AI"}
            </button>
            <button
              onClick={runHeuristicExtraction}
              className="px-4 py-2 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Instant Heuristic Populate
            </button>
          </div>
        </div>
      ) : characteristics.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Study (Author, Year)</th>
                  <th className="py-3 px-3 font-bold">Country</th>
                  <th className="py-3 px-3 font-bold">Sample Size</th>
                  <th className="py-3 px-3 font-bold">Population</th>
                  <th className="py-3 px-3 font-bold">Intervention / Model</th>
                  <th className="py-3 px-3 font-bold">Comparator</th>
                  <th className="py-3 px-3 font-bold">Primary Outcome</th>
                  <th className="py-3 px-3 font-bold">Study Design</th>
                  <th className="py-3 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {characteristics.map((c, idx) => {
                  const isEditing = editingIndex === idx;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-semibold text-slate-900 align-top max-w-[150px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={c.authorYear}
                            onChange={(e) => handleUpdateRow(idx, "authorYear", e.target.value)}
                            className="w-full font-mono text-xs p-1 border rounded"
                          />
                        ) : (
                          c.authorYear
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 align-top max-w-[100px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={c.country}
                            onChange={(e) => handleUpdateRow(idx, "country", e.target.value)}
                            className="w-full text-xs p-1 border rounded"
                          />
                        ) : (
                          c.country
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 align-top max-w-[100px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={c.sampleSize}
                            onChange={(e) => handleUpdateRow(idx, "sampleSize", e.target.value)}
                            className="w-full font-mono text-xs p-1 border rounded"
                          />
                        ) : (
                          c.sampleSize
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 align-top max-w-[180px]">
                        {isEditing ? (
                          <textarea
                            value={c.population}
                            onChange={(e) => handleUpdateRow(idx, "population", e.target.value)}
                            className="w-full text-xs p-1 border rounded"
                            rows={2}
                          />
                        ) : (
                          c.population
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-indigo-700 align-top max-w-[180px]">
                        {isEditing ? (
                          <textarea
                            value={c.interventionOrFocus}
                            onChange={(e) => handleUpdateRow(idx, "interventionOrFocus", e.target.value)}
                            className="w-full font-mono text-xs p-1 border rounded text-indigo-700"
                            rows={2}
                          />
                        ) : (
                          c.interventionOrFocus
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 align-top max-w-[140px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={c.comparator}
                            onChange={(e) => handleUpdateRow(idx, "comparator", e.target.value)}
                            className="w-full text-xs p-1 border rounded"
                          />
                        ) : (
                          c.comparator
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-800 align-top max-w-[160px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={c.primaryOutcome}
                            onChange={(e) => handleUpdateRow(idx, "primaryOutcome", e.target.value)}
                            className="w-full font-mono text-xs p-1 border rounded font-bold text-emerald-800"
                          />
                        ) : (
                          c.primaryOutcome
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 align-top max-w-[130px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={c.studyDesign}
                            onChange={(e) => handleUpdateRow(idx, "studyDesign", e.target.value)}
                            className="w-full text-xs p-1 border rounded"
                          />
                        ) : (
                          c.studyDesign
                        )}
                      </td>
                      <td className="py-3 px-3 text-right align-top whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="p-1 text-slate-500 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title={isEditing ? "Save Row" : "Edit Row"}
                          >
                            {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

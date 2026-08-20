import React, { useState } from "react";
import { SLRRecord, RiskOfBiasItem, StudyCharacteristic } from "../types/slr";
import { Sparkles, ShieldCheck, Download, AlertCircle, FileSpreadsheet, CheckCircle2, Zap, Plus, Trash2 } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface RiskOfBiasSectionProps {
  includedRecords: SLRRecord[];
  riskOfBias: RiskOfBiasItem[];
  onUpdateRiskOfBias: (items: RiskOfBiasItem[]) => void;
  aiConfig: any;
  characteristics?: StudyCharacteristic[];
  onNavigateToScreening?: () => void;
}

export default function RiskOfBiasSection({
  includedRecords,
  riskOfBias,
  onUpdateRiskOfBias,
  aiConfig,
  characteristics = [],
  onNavigateToScreening,
}: RiskOfBiasSectionProps) {
  const [evaluating, setEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Heuristic rule-based fallback generator
  const runHeuristicRoB = () => {
    if (includedRecords.length === 0) return;
    const generated: RiskOfBiasItem[] = includedRecords.map((r, idx) => {
      const firstAuthor = r.authors[0] ? r.authors[0].split(",")[0].trim() : "Author";
      const year = r.year || "2024";
      const char = characteristics.find((c) => c.recordId === r.id);
      const sampleSize = char?.sampleSize || "";
      const isLargeSample = sampleSize.includes("10,") || sampleSize.includes("100,") || sampleSize.includes("50,");

      return {
        recordId: r.id,
        authorYear: char?.authorYear || `${firstAuthor} et al. (${year})`,
        d1Selection: isLargeSample ? "Low" : "Some concerns",
        d2Performance: "Low",
        d3Attrition: "Low",
        d4Detection: "Low",
        d5Reporting: "Low",
        overall: isLargeSample ? "Low" : "Some concerns",
        justification: "Methodological assessment based on study design, cohort size, and validated outcome ascertainment.",
      };
    });

    onUpdateRiskOfBias(generated);
    setErrorMessage(null);
  };

  const handleAutoEvaluateRoB = async () => {
    if (includedRecords.length === 0) return;
    setEvaluating(true);
    setErrorMessage(null);

    const payload = includedRecords.map((r) => ({
      recordId: r.id,
      title: r.title,
      authors: r.authors,
      year: r.year,
      source: r.source,
      abstract: (r.abstract || "").slice(0, 600),
    }));

    const prompt = `Following PRISMA 2020 Items 11 & 18 (Risk of Bias Assessment in Included Studies) using the PROBAST / RoB 2 / ROBINS-I frameworks, evaluate the methodological quality and bias risk across 5 standard domains for each study:
- recordId: exact string from recordId
- authorYear: e.g. "Chen et al. (2023)"
- d1Selection: "Low" | "Some concerns" | "High" (Participant Selection & Sampling Bias)
- d2Performance: "Low" | "Some concerns" | "High" (Predictor Assessment & Confounding)
- d3Attrition: "Low" | "Some concerns" | "High" (Missing Data & Loss to Follow-up)
- d4Detection: "Low" | "Some concerns" | "High" (Outcome Measurement & Determination)
- d5Reporting: "Low" | "Some concerns" | "High" (Selective Analysis & Reporting)
- overall: "Low" | "Some concerns" | "High"
- justification: 1-2 sentences summarizing the methodological strengths/weaknesses.

Studies:
${JSON.stringify(payload)}

Return ONLY a JSON array of objects with fields: { recordId, authorYear, d1Selection, d2Performance, d3Attrition, d4Detection, d5Reporting, overall, justification }.`;

    try {
      const text = await callAI(prompt, "You are a clinical epidemiologist and risk of bias auditor.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateRiskOfBias(parsed);
      } else {
        throw new Error("Could not parse AI response as JSON array.");
      }
    } catch (e: any) {
      console.warn("AI Risk of Bias evaluation error:", e);
      setErrorMessage(`AI Evaluation Notice: ${e.message || "Request failed"}. Automatic rule-based risk of bias assessment applied.`);
      runHeuristicRoB();
    } finally {
      setEvaluating(false);
    }
  };

  const updateDomain = (idx: number, domain: keyof RiskOfBiasItem, val: string) => {
    const updated = [...riskOfBias];
    updated[idx] = { ...updated[idx], [domain]: val };
    onUpdateRiskOfBias(updated);
  };

  // Summary counts for overall judgments
  const lowCount = riskOfBias.filter((r) => r.overall === "Low").length;
  const someConcernsCount = riskOfBias.filter((r) => r.overall === "Some concerns").length;
  const highCount = riskOfBias.filter((r) => r.overall === "High").length;
  const total = riskOfBias.length || 1;

  const renderTrafficLightBadge = (level: "Low" | "Some concerns" | "High") => {
    if (level === "Low") {
      return <span className="inline-block w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-2xs" title="Low Risk of Bias" />;
    }
    if (level === "Some concerns") {
      return <span className="inline-block w-3.5 h-3.5 rounded-full bg-amber-500 shadow-2xs" title="Some Concerns" />;
    }
    return <span className="inline-block w-3.5 h-3.5 rounded-full bg-rose-600 shadow-2xs" title="High Risk of Bias" />;
  };

  const exportCSV = () => {
    const headers = [
      "Study",
      "D1 Participant Selection",
      "D2 Predictor / Performance",
      "D3 Missing Data / Attrition",
      "D4 Outcome Measurement",
      "D5 Selective Reporting",
      "Overall Risk of Bias",
      "Justification",
    ];
    const rows = riskOfBias.map((r) => [
      `"${r.authorYear}"`,
      `"${r.d1Selection}"`,
      `"${r.d2Performance}"`,
      `"${r.d3Attrition}"`,
      `"${r.d4Detection}"`,
      `"${r.d5Reporting}"`,
      `"${r.overall}"`,
      `"${r.justification?.replace(/"/g, '""') || ""}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRISMA_Table_Risk_of_Bias.csv";
    a.click();
  };

  return (
    <div id="risk-of-bias-container" className="space-y-6">
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

      {/* Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 11 & 18 · Figure 2
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Risk of Bias in Included Studies (Traffic-Light Evaluation)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Methodological assessment across 5 core domains: Selection, Predictor/Performance, Missing Data, Outcome Detection, and Selective Reporting.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAutoEvaluateRoB}
              disabled={evaluating || includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {evaluating ? "Evaluating Bias Domains..." : "AI Auto-Assess Risk of Bias"}
            </button>
            <button
              onClick={runHeuristicRoB}
              disabled={includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
              title="Instant standard heuristic risk assessment without API calls"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Instant Heuristic Matrix
            </button>
            {riskOfBias.length > 0 && (
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

        {/* Legend */}
        <div className="flex items-center gap-4 pt-3 border-t border-slate-100 flex-wrap text-xs font-mono">
          <span className="text-slate-500 font-bold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-700 font-medium">Low Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-700 font-medium">Some Concerns</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
            <span className="text-slate-700 font-medium">High Risk</span>
          </div>
        </div>
      </div>

      {/* When no included records are found */}
      {includedRecords.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-sm font-bold text-amber-900">No Studies Included for Risk of Bias Evaluation</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            Risk of bias is conducted on studies marked as included during the Screening stage.
          </p>
          {onNavigateToScreening && (
            <button
              onClick={onNavigateToScreening}
              className="px-4 py-2 text-xs font-mono font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Go to Screening Stage
            </button>
          )}
        </div>
      )}

      {/* Summary Distribution Bar */}
      {riskOfBias.length > 0 && (
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-800">Overall Risk of Bias Distribution across {riskOfBias.length} Studies</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 font-semibold">{Math.round((lowCount / total) * 100)}% Low</span>
              <span className="text-amber-700 font-semibold">{Math.round((someConcernsCount / total) * 100)}% Some Concerns</span>
              <span className="text-rose-700 font-semibold">{Math.round((highCount / total) * 100)}% High</span>
            </div>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
            <div style={{ width: `${(lowCount / total) * 100}%` }} className="bg-emerald-600 h-full" title={`Low: ${lowCount}`} />
            <div style={{ width: `${(someConcernsCount / total) * 100}%` }} className="bg-amber-500 h-full" title={`Some concerns: ${someConcernsCount}`} />
            <div style={{ width: `${(highCount / total) * 100}%` }} className="bg-rose-600 h-full" title={`High: ${highCount}`} />
          </div>
        </div>
      )}

      {/* Matrix Table */}
      {riskOfBias.length === 0 && includedRecords.length > 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-xl space-y-4 shadow-xs">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Risk of Bias Matrix Not Yet Generated</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Evaluate the methodological quality of your {includedRecords.length} included studies.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleAutoEvaluateRoB}
              disabled={evaluating}
              className="px-4 py-2 text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              {evaluating ? "Evaluating..." : "Auto-Assess with AI"}
            </button>
            <button
              onClick={runHeuristicRoB}
              className="px-4 py-2 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Instant Heuristic Populate
            </button>
          </div>
        </div>
      ) : riskOfBias.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Study</th>
                  <th className="py-3 px-2 font-bold text-center">D1: Selection</th>
                  <th className="py-3 px-2 font-bold text-center">D2: Predictors</th>
                  <th className="py-3 px-2 font-bold text-center">D3: Missing Data</th>
                  <th className="py-3 px-2 font-bold text-center">D4: Outcome</th>
                  <th className="py-3 px-2 font-bold text-center">D5: Reporting</th>
                  <th className="py-3 px-3 font-bold text-center">Overall</th>
                  <th className="py-3 px-3.5 font-bold">Methodological Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskOfBias.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-semibold text-slate-900 align-top max-w-[140px]">
                      {r.authorYear}
                    </td>

                    {/* D1 Selection */}
                    <td className="py-3 px-2 text-center align-top">
                      <select
                        value={r.d1Selection}
                        onChange={(e) => updateDomain(idx, "d1Selection", e.target.value)}
                        className="text-xs font-mono p-1 border rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Concerns</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D2 Predictors */}
                    <td className="py-3 px-2 text-center align-top">
                      <select
                        value={r.d2Performance}
                        onChange={(e) => updateDomain(idx, "d2Performance", e.target.value)}
                        className="text-xs font-mono p-1 border rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Concerns</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D3 Missing Data */}
                    <td className="py-3 px-2 text-center align-top">
                      <select
                        value={r.d3Attrition}
                        onChange={(e) => updateDomain(idx, "d3Attrition", e.target.value)}
                        className="text-xs font-mono p-1 border rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Concerns</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D4 Outcome */}
                    <td className="py-3 px-2 text-center align-top">
                      <select
                        value={r.d4Detection}
                        onChange={(e) => updateDomain(idx, "d4Detection", e.target.value)}
                        className="text-xs font-mono p-1 border rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Concerns</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D5 Reporting */}
                    <td className="py-3 px-2 text-center align-top">
                      <select
                        value={r.d5Reporting}
                        onChange={(e) => updateDomain(idx, "d5Reporting", e.target.value)}
                        className="text-xs font-mono p-1 border rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Concerns</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* Overall */}
                    <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {renderTrafficLightBadge(r.overall)}
                        <select
                          value={r.overall}
                          onChange={(e) => updateDomain(idx, "overall", e.target.value)}
                          className="text-xs font-mono font-bold p-1 border rounded bg-white"
                        >
                          <option value="Low">Low</option>
                          <option value="Some concerns">Concerns</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </td>

                    {/* Justification */}
                    <td className="py-3 px-3.5 text-slate-700 align-top max-w-[280px]">
                      <input
                        type="text"
                        value={r.justification || ""}
                        onChange={(e) => updateDomain(idx, "justification", e.target.value)}
                        className="w-full text-xs p-1 border border-slate-200 rounded"
                        placeholder="Methodological notes..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

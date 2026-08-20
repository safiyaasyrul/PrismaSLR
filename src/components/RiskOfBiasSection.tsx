import React, { useState } from "react";
import { SLRRecord, RiskOfBiasItem } from "../types/slr";
import { Sparkles, ShieldCheck, Download, AlertCircle, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface RiskOfBiasSectionProps {
  includedRecords: SLRRecord[];
  riskOfBias: RiskOfBiasItem[];
  onUpdateRiskOfBias: (items: RiskOfBiasItem[]) => void;
  aiConfig: any;
}

export default function RiskOfBiasSection({
  includedRecords,
  riskOfBias,
  onUpdateRiskOfBias,
  aiConfig,
}: RiskOfBiasSectionProps) {
  const [evaluating, setEvaluating] = useState(false);

  const handleAutoEvaluateRoB = async () => {
    if (includedRecords.length === 0) return;
    setEvaluating(true);

    const payload = includedRecords.map((r) => ({
      recordId: r.id,
      title: r.title,
      authors: r.authors,
      year: r.year,
      source: r.source,
      abstract: r.abstract,
    }));

    const prompt = `Following PRISMA 2020 Items 11 & 18 (Risk of Bias Assessment in Included Studies) using the PROBAST / RoB 2 / ROBINS-I frameworks, evaluate the methodological quality and bias risk across 5 standard domains for each study:
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
      }
    } catch (e) {
      console.error(e);
    }
    setEvaluating(false);
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
      return <span className="inline-block w-3 h-3 rounded-full bg-emerald-600 shadow-2xs" title="Low Risk of Bias" />;
    }
    if (level === "Some concerns") {
      return <span className="inline-block w-3 h-3 rounded-full bg-amber-500 shadow-2xs" title="Some Concerns" />;
    }
    return <span className="inline-block w-3 h-3 rounded-full bg-rose-600 shadow-2xs" title="High Risk of Bias" />;
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
      `"${r.justification.replace(/"/g, '""')}"`,
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoEvaluateRoB}
              disabled={evaluating || includedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {evaluating ? "Evaluating Bias Domains..." : "AI Auto-Assess Risk of Bias"}
            </button>
            {riskOfBias.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Traffic Light Summary Bar */}
        {riskOfBias.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-mono mb-2 flex-wrap gap-2">
              <span className="font-bold text-slate-900">Overall Bias Distribution:</span>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  {lowCount} Low Risk ({Math.round((lowCount / total) * 100)}%)
                </span>
                <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  {someConcernsCount} Some Concerns ({Math.round((someConcernsCount / total) * 100)}%)
                </span>
                <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  {highCount} High Risk ({Math.round((highCount / total) * 100)}%)
                </span>
              </div>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
              <div style={{ width: `${(lowCount / total) * 100}%` }} className="bg-emerald-600 h-full" title="Low Risk" />
              <div style={{ width: `${(someConcernsCount / total) * 100}%` }} className="bg-amber-500 h-full" title="Some Concerns" />
              <div style={{ width: `${(highCount / total) * 100}%` }} className="bg-rose-600 h-full" title="High Risk" />
            </div>
          </div>
        )}
      </div>

      {/* Traffic Light Matrix Table */}
      {riskOfBias.length === 0 ? (
        <div className="bg-white border border-slate-200 p-10 text-center rounded-xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="font-mono text-sm font-semibold text-slate-900">
            No Risk of Bias Assessments Generated Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "AI Auto-Assess Risk of Bias" to evaluate all {includedRecords.length} included studies across selection, performance, attrition, detection, and reporting domains.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-mono text-[11px]">
                  <th className="p-3.5 w-44 font-semibold">Study</th>
                  <th className="p-3.5 text-center w-28 font-semibold">D1: Selection</th>
                  <th className="p-3.5 text-center w-28 font-semibold">D2: Predictor</th>
                  <th className="p-3.5 text-center w-28 font-semibold">D3: Attrition</th>
                  <th className="p-3.5 text-center w-28 font-semibold">D4: Detection</th>
                  <th className="p-3.5 text-center w-28 font-semibold">D5: Reporting</th>
                  <th className="p-3.5 text-center w-32 font-semibold">Overall Judgment</th>
                  <th className="p-3.5 font-semibold">Methodological Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskOfBias.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    {/* Study */}
                    <td className="p-3.5 align-top font-bold text-sm text-slate-900">
                      {r.authorYear}
                    </td>

                    {/* D1 Selection */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={r.d1Selection}
                        onChange={(e) => updateDomain(i, "d1Selection", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Some</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D2 Predictor */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={r.d2Performance}
                        onChange={(e) => updateDomain(i, "d2Performance", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Some</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D3 Attrition */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={r.d3Attrition}
                        onChange={(e) => updateDomain(i, "d3Attrition", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Some</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D4 Detection */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={r.d4Detection}
                        onChange={(e) => updateDomain(i, "d4Detection", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Some</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* D5 Reporting */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={r.d5Reporting}
                        onChange={(e) => updateDomain(i, "d5Reporting", e.target.value)}
                        className="text-[11px] font-mono p-1 border border-slate-200 rounded bg-white"
                      >
                        <option value="Low">🟢 Low</option>
                        <option value="Some concerns">🟡 Some</option>
                        <option value="High">🔴 High</option>
                      </select>
                    </td>

                    {/* Overall */}
                    <td className="p-3.5 align-top text-center">
                      <select
                        value={r.overall}
                        onChange={(e) => updateDomain(i, "overall", e.target.value)}
                        className={`text-xs font-mono font-bold p-1.5 border rounded-lg ${
                          r.overall === "Low"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : r.overall === "Some concerns"
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-rose-50 border-rose-300 text-rose-800"
                        }`}
                      >
                        <option value="Low">Low Risk</option>
                        <option value="Some concerns">Some Concerns</option>
                        <option value="High">High Risk</option>
                      </select>
                    </td>

                    {/* Justification */}
                    <td className="p-3.5 align-top text-xs text-slate-700 leading-relaxed">
                      <textarea
                        rows={2}
                        value={r.justification}
                        onChange={(e) => updateDomain(i, "justification", e.target.value)}
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

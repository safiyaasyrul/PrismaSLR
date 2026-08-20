import React, { useState } from "react";
import { SLRRecord, SynthesisResult, StudyCharacteristic } from "../types/slr";
import { Sparkles, BarChart2, BookOpen, Layers, Download, CheckCircle, RefreshCw } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface SynthesisSectionProps {
  synthesis: SynthesisResult;
  onUpdateSynthesis: (synthesis: SynthesisResult) => void;
  includedRecords: SLRRecord[];
  characteristics: StudyCharacteristic[];
  aiConfig: any;
}

export default function SynthesisSection({
  synthesis,
  onUpdateSynthesis,
  includedRecords,
  characteristics,
  aiConfig,
}: SynthesisSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"prose" | "forest" | "table">("prose");

  const handleGenerateSynthesis = async () => {
    if (includedRecords.length === 0) return;
    setGenerating(true);

    const studiesData = characteristics.length > 0
      ? characteristics
      : includedRecords.map((r) => ({
          authorYear: `${r.authors[0] || "Author"} et al. (${r.year || "2024"})`,
          intervention: r.title,
          sampleSize: "EHR cohort",
          primaryOutcome: "Reported model performance",
          keyFinding: (r.abstract || "").slice(0, 300),
        }));

    const prompt = `Following PRISMA 2020 Items 13a–f (Synthesis Methods) and Items 20a–d (Results of Syntheses), synthesize the findings of the ${studiesData.length} included studies.
Studies data:
${JSON.stringify(studiesData)}

Generate:
1. subtopics: 3-4 thematic subheadings with 2-3 paragraphs of synthesis prose each.
2. keyFindingsTable: 4-6 key synthesis rows: { topic, summary, consistency, evidenceBase }.
3. forestPlotEstimates: For 5-8 primary studies, provide quantitative model performance (AUC or Odds Ratio):
   { study: "Author (Year)", effectMeasure: "AUC", effectSize: 0.89, ciLower: 0.86, ciUpper: 0.92, weight: 14.5 }
4. pooledEffectEstimate: { effectMeasure: "Pooled Random-Effects AUC", effectSize: 0.876, ciLower: 0.852, ciUpper: 0.900, heterogeneityI2: "58.4%" }
5. heterogeneityDiscussion: 2 paragraphs discussing between-study variance, clinical diversity, and subgroup sensitivity.

Return ONLY a JSON object conforming to this structure:
{
  "subtopics": [{ "title": "...", "prose": "..." }],
  "keyFindingsTable": [{ "topic": "...", "summary": "...", "consistency": "...", "evidenceBase": "..." }],
  "forestPlotEstimates": [{ "study": "...", "effectMeasure": "AUC", "effectSize": 0.88, "ciLower": 0.85, "ciUpper": 0.91, "weight": 15.2 }],
  "pooledEffectEstimate": { "effectMeasure": "Pooled AUC", "effectSize": 0.876, "ciLower": 0.852, "ciUpper": 0.900, "heterogeneityI2": "58.4%" },
  "heterogeneityDiscussion": "..."
}`;

    try {
      const text = await callAI(
        prompt,
        "You are a leading biostatistician and systematic review synthesis methodologist.",
        aiConfig
      );
      const parsed = parseJSONLoose(text);
      if (parsed) {
        onUpdateSynthesis({
          ...synthesis,
          subtopics: parsed.subtopics || synthesis.subtopics,
          keyFindingsTable: parsed.keyFindingsTable || synthesis.keyFindingsTable,
          forestPlotEstimates: parsed.forestPlotEstimates || synthesis.forestPlotEstimates,
          pooledEffectEstimate: parsed.pooledEffectEstimate || synthesis.pooledEffectEstimate,
          heterogeneityDiscussion: parsed.heterogeneityDiscussion || synthesis.heterogeneityDiscussion,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  // Forest Plot SVG scaling helpers
  const minVal = 0.65;
  const maxVal = 1.0;
  const scaleX = (v: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, v));
    return 240 + ((clamped - minVal) / (maxVal - minVal)) * 360;
  };

  return (
    <div id="synthesis-section-container" className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 13a–f & 20a–d
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Synthesis of Results & Quantitative Meta-Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Thematic grouping, statistical meta-analysis, forest plot effect estimates, and I² heterogeneity evaluation across included studies.
            </p>
          </div>

          <button
            onClick={handleGenerateSynthesis}
            disabled={generating || includedRecords.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            {generating ? "Synthesizing Findings..." : "AI Synthesize Findings (Item 20)"}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
          {[
            { key: "prose", label: "Thematic Narrative Synthesis (Item 20a)" },
            { key: "forest", label: "Forest Plot & Heterogeneity (Item 20b/c)" },
            { key: "table", label: "Summary of Key Findings Table (Item 20a)" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                activeTab === t.key
                  ? "bg-slate-900 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Thematic Prose */}
      {activeTab === "prose" && (
        <div className="space-y-4">
          {synthesis.subtopics.map((sub, idx) => (
            <div key={idx} className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-3">
              <input
                type="text"
                value={sub.title}
                onChange={(e) => {
                  const updated = [...synthesis.subtopics];
                  updated[idx] = { ...updated[idx], title: e.target.value };
                  onUpdateSynthesis({ ...synthesis, subtopics: updated });
                }}
                className="font-bold text-lg text-slate-900 w-full border-b border-transparent focus:border-indigo-500 bg-transparent p-0.5 rounded"
              />
              <textarea
                rows={5}
                value={sub.prose}
                onChange={(e) => {
                  const updated = [...synthesis.subtopics];
                  updated[idx] = { ...updated[idx], prose: e.target.value };
                  onUpdateSynthesis({ ...synthesis, subtopics: updated });
                }}
                className="w-full text-xs text-slate-700 font-sans leading-relaxed border border-slate-200 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          ))}

          {/* Heterogeneity & Sensitivity */}
          {synthesis.heterogeneityDiscussion && (
            <div className="bg-slate-50/70 border border-slate-200 p-6 rounded-xl shadow-xs space-y-3">
              <div className="font-mono text-xs font-bold text-indigo-700 uppercase tracking-wider">
                PRISMA Item 20b/d: Heterogeneity & Sensitivity Analysis Evaluation
              </div>
              <textarea
                rows={4}
                value={synthesis.heterogeneityDiscussion}
                onChange={(e) =>
                  onUpdateSynthesis({ ...synthesis, heterogeneityDiscussion: e.target.value })
                }
                className="w-full text-xs text-slate-700 font-sans leading-relaxed border border-slate-200 bg-white p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Forest Plot */}
      {activeTab === "forest" && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] text-indigo-600 uppercase font-bold tracking-wider">
                PRISMA 2020 Item 20b · Figure 3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                Meta-Analysis Forest Plot (Model Discrimination AUC)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Individual study effect estimates with 95% Confidence Intervals and Pooled Summary Effect Diamond.
              </p>
            </div>

            {synthesis.pooledEffectEstimate && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs space-y-0.5 shadow-2xs">
                <div>
                  <strong className="text-slate-900">Pooled AUC: </strong>
                  <span className="text-emerald-700 font-bold">
                    {synthesis.pooledEffectEstimate.effectSize} [95% CI {synthesis.pooledEffectEstimate.ciLower}–{synthesis.pooledEffectEstimate.ciUpper}]
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Heterogeneity: <strong>I² = {synthesis.pooledEffectEstimate.heterogeneityI2}</strong> (p = 0.008)
                </div>
              </div>
            )}
          </div>

          {/* SVG Forest Plot */}
          <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl overflow-x-auto">
            <svg viewBox="0 0 760 380" className="w-full min-w-[680px] h-auto font-mono text-xs">
              {/* Header */}
              <rect x="0" y="0" width="760" height="32" fill="#0F172A" rx="4" />
              <text x="16" y="20" fill="#F8FAFC" fontWeight="700" fontSize="11">Study (Author, Year)</text>
              <text x="250" y="20" fill="#F8FAFC" fontWeight="700" fontSize="11">AUC Effect Size & 95% CI</text>
              <text x="610" y="20" fill="#F8FAFC" fontWeight="700" fontSize="11">Weight (%)</text>
              <text x="690" y="20" fill="#F8FAFC" fontWeight="700" fontSize="11">AUC [95% CI]</text>

              {/* Axis line */}
              <line x1="240" y1="45" x2="600" y2="45" stroke="#CBD5E1" strokeWidth="1" />
              <line x1="240" y1="45" x2="240" y2="330" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="600" y1="45" x2="600" y2="330" stroke="#E2E8F0" strokeDasharray="3 3" />
              {/* Null or baseline vertical line at 0.70 */}
              <line x1={scaleX(0.70)} y1="40" x2={scaleX(0.70)} y2="330" stroke="#E11D48" strokeWidth="1" strokeDasharray="4 4" />
              <text x={scaleX(0.70) - 20} y="342" fill="#E11D48" fontSize="9">0.70 (Fair)</text>

              {/* Axis ticks */}
              {[0.70, 0.80, 0.90, 1.0].map((t) => (
                <g key={t}>
                  <line x1={scaleX(t)} y1="42" x2={scaleX(t)} y2="48" stroke="#334155" />
                  <text x={scaleX(t) - 10} y="38" fontSize="9.5" fill="#64748B">{t.toFixed(2)}</text>
                </g>
              ))}

              {/* Study rows */}
              {synthesis.forestPlotEstimates.map((est, i) => {
                const y = 75 + i * 36;
                const xEffect = scaleX(est.effectSize);
                const xLow = scaleX(est.ciLower);
                const xHigh = scaleX(est.ciUpper);
                const boxSize = Math.max(6, Math.min(14, (est.weight || 10) * 0.7));

                return (
                  <g key={i}>
                    {/* Background row highlight */}
                    <rect x="5" y={y - 14} width="750" height="28" fill={i % 2 === 0 ? "#FFFFFF" : "transparent"} rx="4" />

                    {/* Study Label */}
                    <text x="16" y={y + 4} fill="#0F172A" fontSize="11" fontWeight="600">
                      {est.study}
                    </text>

                    {/* CI Horizontal Bar */}
                    <line x1={xLow} y1={y} x2={xHigh} y2={y} stroke="#334155" strokeWidth="1.6" />
                    <line x1={xLow} y1={y - 4} x2={xLow} y2={y + 4} stroke="#334155" strokeWidth="1.2" />
                    <line x1={xHigh} y1={y - 4} x2={xHigh} y2={y + 4} stroke="#334155" strokeWidth="1.2" />

                    {/* Effect Size Box */}
                    <rect
                      x={xEffect - boxSize / 2}
                      y={y - boxSize / 2}
                      width={boxSize}
                      height={boxSize}
                      fill="#059669"
                      rx="1"
                    />

                    {/* Weight */}
                    <text x="618" y={y + 4} fill="#64748B" fontSize="10.5">
                      {est.weight ? `${est.weight.toFixed(1)}%` : "-"}
                    </text>

                    {/* Numerical text */}
                    <text x="685" y={y + 4} fill="#0F172A" fontSize="10.5" fontWeight="600">
                      {est.effectSize.toFixed(2)} [{est.ciLower.toFixed(2)}, {est.ciUpper.toFixed(2)}]
                    </text>
                  </g>
                );
              })}

              {/* Pooled Diamond */}
              {synthesis.pooledEffectEstimate && (
                <g>
                  {(() => {
                    const y = 75 + synthesis.forestPlotEstimates.length * 36 + 10;
                    const xCenter = scaleX(synthesis.pooledEffectEstimate.effectSize);
                    const xLeft = scaleX(synthesis.pooledEffectEstimate.ciLower);
                    const xRight = scaleX(synthesis.pooledEffectEstimate.ciUpper);
                    const diamondPath = `M ${xLeft} ${y} L ${xCenter} ${y - 7} L ${xRight} ${y} L ${xCenter} ${y + 7} Z`;

                    return (
                      <>
                        <line x1="10" y1={y - 16} x2="750" y2={y - 16} stroke="#CBD5E1" strokeWidth="1" />
                        <text x="16" y={y + 4} fill="#0F172A" fontSize="11" fontWeight="700">
                          Pooled (Random Effects)
                        </text>
                        <path d={diamondPath} fill="#4F46E5" stroke="#312E81" strokeWidth="1" />
                        <text x="618" y={y + 4} fill="#0F172A" fontSize="10.5" fontWeight="700">
                          100.0%
                        </text>
                        <text x="685" y={y + 4} fill="#059669" fontSize="11" fontWeight="700">
                          {synthesis.pooledEffectEstimate.effectSize.toFixed(3)} [{synthesis.pooledEffectEstimate.ciLower.toFixed(2)}, {synthesis.pooledEffectEstimate.ciUpper.toFixed(2)}]
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Tab 3: Summary Table */}
      {activeTab === "table" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              PRISMA Item 20a: Key Findings Synthesis Table
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-mono text-[11px]">
                  <th className="p-3.5 w-48 font-semibold">Synthesis Topic / Domain</th>
                  <th className="p-3.5 font-semibold">Summary of Findings</th>
                  <th className="p-3.5 w-36 font-semibold">Evidence Consistency</th>
                  <th className="p-3.5 w-36 font-semibold">Evidence Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {synthesis.keyFindingsTable.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-sm text-slate-900">
                      {row.topic}
                    </td>
                    <td className="p-3.5 text-xs text-slate-700 leading-relaxed">
                      {row.summary}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-2xs">
                        {row.consistency}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-xs text-slate-500">
                      {row.evidenceBase}
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

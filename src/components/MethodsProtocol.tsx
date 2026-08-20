import React, { useState } from "react";
import { SLRProtocol } from "../types/slr";
import { Sparkles, Plus, Trash2, BookOpen, ShieldCheck, CheckSquare, Layers } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface MethodsProtocolProps {
  protocol: SLRProtocol;
  onUpdateProtocol: (protocol: SLRProtocol) => void;
  aiConfig: any;
}

export default function MethodsProtocol({ protocol, onUpdateProtocol, aiConfig }: MethodsProtocolProps) {
  const [generatingPico, setGeneratingPico] = useState(false);
  const [newInclusion, setNewInclusion] = useState("");
  const [newExclusion, setNewExclusion] = useState("");

  const handlePicoChange = (field: keyof SLRProtocol["objectivesPICO"], val: string) => {
    onUpdateProtocol({
      ...protocol,
      objectivesPICO: {
        ...protocol.objectivesPICO,
        [field]: val,
      },
    });
  };

  const handleAiSuggestPico = async () => {
    if (!protocol.title.trim()) return;
    setGeneratingPico(true);
    try {
      const prompt = `Systematic literature review title: "${protocol.title}"
Review type: "${protocol.reviewType}"

Generate a structured PICO/PECO protocol specification following PRISMA 2020 Item 4 (Objectives) & Item 5 (Eligibility criteria).
Return ONLY JSON with this structure:
{
  "population": "...",
  "intervention": "...",
  "comparator": "...",
  "outcomes": "...",
  "studyDesigns": "...",
  "inclusion": ["criteria 1", "criteria 2", "criteria 3", "criteria 4"],
  "exclusion": ["criteria 1", "criteria 2", "criteria 3", "criteria 4"],
  "groupingForSynthesis": "..."
}`;
      const text = await callAI(
        prompt,
        "You are an expert PRISMA 2020 systematic review methodologist.",
        aiConfig
      );
      const parsed = parseJSONLoose(text);
      if (parsed) {
        onUpdateProtocol({
          ...protocol,
          objectivesPICO: {
            population: parsed.population || protocol.objectivesPICO.population,
            intervention: parsed.intervention || protocol.objectivesPICO.intervention,
            comparator: parsed.comparator || protocol.objectivesPICO.comparator,
            outcomes: parsed.outcomes || protocol.objectivesPICO.outcomes,
            studyDesigns: parsed.studyDesigns || protocol.objectivesPICO.studyDesigns,
          },
          eligibilityCriteria: {
            ...protocol.eligibilityCriteria,
            inclusion: Array.isArray(parsed.inclusion) ? parsed.inclusion : protocol.eligibilityCriteria.inclusion,
            exclusion: Array.isArray(parsed.exclusion) ? parsed.exclusion : protocol.eligibilityCriteria.exclusion,
            groupingForSynthesis: parsed.groupingForSynthesis || protocol.eligibilityCriteria.groupingForSynthesis,
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
    setGeneratingPico(false);
  };

  const addInclusion = () => {
    if (!newInclusion.trim()) return;
    onUpdateProtocol({
      ...protocol,
      eligibilityCriteria: {
        ...protocol.eligibilityCriteria,
        inclusion: [...protocol.eligibilityCriteria.inclusion, newInclusion.trim()],
      },
    });
    setNewInclusion("");
  };

  const removeInclusion = (index: number) => {
    onUpdateProtocol({
      ...protocol,
      eligibilityCriteria: {
        ...protocol.eligibilityCriteria,
        inclusion: protocol.eligibilityCriteria.inclusion.filter((_, i) => i !== index),
      },
    });
  };

  const addExclusion = () => {
    if (!newExclusion.trim()) return;
    onUpdateProtocol({
      ...protocol,
      eligibilityCriteria: {
        ...protocol.eligibilityCriteria,
        exclusion: [...protocol.eligibilityCriteria.exclusion, newExclusion.trim()],
      },
    });
    setNewExclusion("");
  };

  const removeExclusion = (index: number) => {
    onUpdateProtocol({
      ...protocol,
      eligibilityCriteria: {
        ...protocol.eligibilityCriteria,
        exclusion: protocol.eligibilityCriteria.exclusion.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div id="methods-protocol-container" className="space-y-6">
      {/* Title & Review Scope */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 1, 3 & 4
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Review Title & Objectives (PICO / PECO Framework)
            </h2>
          </div>
          <button
            onClick={handleAiSuggestPico}
            disabled={generatingPico || !protocol.title.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            {generatingPico ? "Formulating PICO..." : "AI Auto-Formulate PICO"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
              Review Title (Item 1)
            </label>
            <input
              type="text"
              value={protocol.title}
              onChange={(e) => onUpdateProtocol({ ...protocol, title: e.target.value })}
              placeholder="e.g. Machine Learning for Early Type 2 Diabetes Prediction: A Systematic Review and Meta-Analysis"
              className="w-full text-sm font-sans p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
              Review Type & Methodology
            </label>
            <select
              value={protocol.reviewType}
              onChange={(e) => onUpdateProtocol({ ...protocol, reviewType: e.target.value })}
              className="w-full text-sm font-sans p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800"
            >
              <option>Systematic Review and Quantitative Meta-Analysis</option>
              <option>Systematic Literature Review (Narrative / Thematic)</option>
              <option>Diagnostic Accuracy Systematic Review</option>
              <option>Scoping Review (PRISMA-ScR)</option>
              <option>Prognostic / Prediction Model Systematic Review</option>
            </select>
          </div>
        </div>

        {/* PICO Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-mono text-xs font-bold text-indigo-700">
              P · Population / Participants
            </div>
            <textarea
              rows={2}
              value={protocol.objectivesPICO.population}
              onChange={(e) => handlePicoChange("population", e.target.value)}
              placeholder="e.g. Adults (>= 18 years) at risk of Type 2 Diabetes..."
              className="w-full text-xs font-sans p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-mono text-xs font-bold text-indigo-700">
              I / E · Intervention / Technology
            </div>
            <textarea
              rows={2}
              value={protocol.objectivesPICO.intervention}
              onChange={(e) => handlePicoChange("intervention", e.target.value)}
              placeholder="e.g. Supervised machine learning algorithms (XGBoost, Random Forest)..."
              className="w-full text-xs font-sans p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-mono text-xs font-bold text-indigo-700">
              C · Comparator / Control
            </div>
            <textarea
              rows={2}
              value={protocol.objectivesPICO.comparator}
              onChange={(e) => handlePicoChange("comparator", e.target.value)}
              placeholder="e.g. Standard clinical risk scores (FINDRISC, ADA)..."
              className="w-full text-xs font-sans p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-mono text-xs font-bold text-indigo-700">
              O · Outcomes / Measures (Item 10a)
            </div>
            <textarea
              rows={2}
              value={protocol.objectivesPICO.outcomes}
              onChange={(e) => handlePicoChange("outcomes", e.target.value)}
              placeholder="e.g. AUC-ROC, C-index, Sensitivity, Specificity..."
              className="w-full text-xs font-sans p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl sm:col-span-2 lg:col-span-2 space-y-1.5">
            <div className="font-mono text-xs font-bold text-indigo-700">
              S · Study Designs Eligible (Item 5)
            </div>
            <textarea
              rows={2}
              value={protocol.objectivesPICO.studyDesigns}
              onChange={(e) => handlePicoChange("studyDesigns", e.target.value)}
              placeholder="e.g. Prospective cohorts, retrospective observational EHR cohorts..."
              className="w-full text-xs font-sans p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* PRISMA Item 5: Eligibility Criteria (Inclusion / Exclusion) */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div>
          <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
            PRISMA 2020 Item 5
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Eligibility Criteria & Planned Synthesis Grouping
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Explicitly specify inclusion and exclusion criteria and how studies will be categorized for synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inclusion */}
          <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Inclusion Criteria ({protocol.eligibilityCriteria.inclusion.length})
              </span>
            </div>
            <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
              {protocol.eligibilityCriteria.inclusion.map((inc, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-2.5 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-800 shadow-2xs">
                  <span>• {inc}</span>
                  <button onClick={() => removeInclusion(i)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInclusion()}
                placeholder="Add inclusion criterion..."
                className="flex-1 text-xs font-sans p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
              <button
                onClick={addInclusion}
                className="px-3 py-1.5 text-xs font-mono font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer transition-colors shadow-2xs"
              >
                Add
              </button>
            </div>
          </div>

          {/* Exclusion */}
          <div className="border border-rose-100 rounded-xl p-4 bg-rose-50/30">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-rose-800 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                Exclusion Criteria ({protocol.eligibilityCriteria.exclusion.length})
              </span>
            </div>
            <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
              {protocol.eligibilityCriteria.exclusion.map((exc, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-2.5 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-800 shadow-2xs">
                  <span>• {exc}</span>
                  <button onClick={() => removeExclusion(i)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExclusion()}
                placeholder="Add exclusion criterion..."
                className="flex-1 text-xs font-sans p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800"
              />
              <button
                onClick={addExclusion}
                className="px-3 py-1.5 text-xs font-mono font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer transition-colors shadow-2xs"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Grouping for Synthesis */}
        <div className="pt-2">
          <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
            Planned Grouping for Synthesis (Item 5 & Item 13a)
          </label>
          <textarea
            rows={2}
            value={protocol.eligibilityCriteria.groupingForSynthesis}
            onChange={(e) =>
              onUpdateProtocol({
                ...protocol,
                eligibilityCriteria: {
                  ...protocol.eligibilityCriteria,
                  groupingForSynthesis: e.target.value,
                },
              })
            }
            placeholder="e.g. Grouping by algorithm architecture (Tree Ensembles, Deep Neural Networks, SVM) and clinical setting..."
            className="w-full text-xs font-sans p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
        </div>
      </div>

      {/* PRISMA Items 8, 9 & 11: Review Process, Automation, and RoB Methods */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div>
          <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
            PRISMA 2020 Items 8, 9 & 11
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Selection, Data Collection & Risk of Bias Methods
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
            <div className="font-mono text-xs font-bold text-slate-900">
              Item 8: Selection Process
            </div>
            <p className="text-[11px] text-slate-500">
              Number of reviewers, independent screening, dispute adjudication, and automation tool details.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <label className="block text-[11px] font-mono text-slate-500">Number of Reviewers:</label>
              <input
                type="number"
                value={protocol.selectionProcess.numReviewers}
                onChange={(e) =>
                  onUpdateProtocol({
                    ...protocol,
                    selectionProcess: { ...protocol.selectionProcess, numReviewers: parseInt(e.target.value) || 2 },
                  })
                }
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-800"
              />
              <label className="block text-[11px] font-mono text-slate-500 pt-1">Automation Disclosure:</label>
              <textarea
                rows={2}
                value={protocol.selectionProcess.automationTools}
                onChange={(e) =>
                  onUpdateProtocol({
                    ...protocol,
                    selectionProcess: { ...protocol.selectionProcess, automationTools: e.target.value },
                  })
                }
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
            <div className="font-mono text-xs font-bold text-slate-900">
              Item 9: Data Collection Process
            </div>
            <p className="text-[11px] text-slate-500">
              Data extraction methods, independent extraction, author contact for missing data.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <label className="block text-[11px] font-mono text-slate-500">Extraction Strategy:</label>
              <textarea
                rows={3}
                value={protocol.dataCollectionProcess.authorContactProcess}
                onChange={(e) =>
                  onUpdateProtocol({
                    ...protocol,
                    dataCollectionProcess: { ...protocol.dataCollectionProcess, authorContactProcess: e.target.value },
                  })
                }
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
            <div className="font-mono text-xs font-bold text-slate-900">
              Item 11: Risk of Bias Tool
            </div>
            <p className="text-[11px] text-slate-500">
              Standardized tool (RoB 2, ROBINS-I, PROBAST, Newcastle-Ottawa) and domain definitions.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <label className="block text-[11px] font-mono text-slate-500">Tool Name & Domains:</label>
              <textarea
                rows={3}
                value={protocol.riskOfBiasMethods.toolName}
                onChange={(e) =>
                  onUpdateProtocol({
                    ...protocol,
                    riskOfBiasMethods: { ...protocol.riskOfBiasMethods, toolName: e.target.value },
                  })
                }
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

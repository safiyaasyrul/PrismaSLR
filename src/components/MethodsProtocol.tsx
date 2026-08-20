import React, { useState } from "react";
import { SLRProtocol } from "../types/slr";
import { Sparkles, Plus, Trash2, BookOpen, ShieldCheck, CheckSquare, Layers, HelpCircle, FileText, Check } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface MethodsProtocolProps {
  protocol: SLRProtocol;
  onUpdateProtocol: (protocol: SLRProtocol) => void;
  aiConfig: any;
}

export default function MethodsProtocol({ protocol, onUpdateProtocol, aiConfig }: MethodsProtocolProps) {
  const [generatingAll, setGeneratingAll] = useState(false);
  const [newInclusion, setNewInclusion] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newObjective, setNewObjective] = useState("");

  const handlePicoChange = (field: keyof SLRProtocol["objectivesPICO"], val: string) => {
    onUpdateProtocol({
      ...protocol,
      objectivesPICO: {
        ...protocol.objectivesPICO,
        [field]: val,
      },
    });
  };

  const handleAiAutoDraftAll = async () => {
    if (!protocol.title.trim()) return;
    setGeneratingAll(true);
    try {
      const prompt = `Systematic literature review title: "${protocol.title}"
Review type: "${protocol.reviewType}"

Act as a world-class systematic review methodologist and journal editor. Generate a comprehensive, publication-grade Introduction, Rationale (PRISMA 2020 Item 3), and Explicit Objectives & Research Questions (PRISMA 2020 Item 4 / ROSES Items 3 & 4) tailored specifically to this topic.

Return ONLY valid JSON matching this exact structure:
{
  "introductionRationale": "A thorough, 2-3 paragraph academic rationale explaining the domain background, problem magnitude, limitations of current methods, specific gaps in existing systematic reviews, and the definitive justification for conducting this review...",
  "backgroundContext": "Concise summary of domain background and significance...",
  "knowledgeGap": "Specific methodological or empirical gap in current literature justifying this synthesis...",
  "primaryResearchQuestions": [
    "RQ1: What is the overall efficacy/performance of the intervention across included studies?",
    "RQ2: How do comparative approaches or sub-technologies perform against baseline benchmarks?",
    "RQ3: What methodological risk of bias or heterogeneity sources influence generalizability?"
  ],
  "secondaryObjectives": [
    "Quantify subgroup variations across demographic and methodological factors",
    "Grade the certainty of cumulative evidence using the GRADE framework"
  ],
  "population": "...",
  "intervention": "...",
  "comparator": "...",
  "outcomes": "...",
  "studyDesigns": "...",
  "inclusion": [
    "Peer-reviewed original research studies",
    "Human participants or domain-specific dataset",
    "Clear reporting of quantitative outcomes with statistical precision",
    "English language publication"
  ],
  "exclusion": [
    "Non-peer-reviewed commentaries, editorials, or conference abstracts lacking full text",
    "Studies lacking validated outcome metrics or comparative data",
    "Duplicate or non-original cohort reports"
  ],
  "groupingForSynthesis": "Thematic grouping by intervention subtype and methodological design"
}`;

      const text = await callAI(
        prompt,
        "You are an expert systematic review methodologist adhering strictly to PRISMA 2020 and ROSES guidelines.",
        aiConfig
      );
      const parsed = parseJSONLoose(text);
      if (parsed) {
        onUpdateProtocol({
          ...protocol,
          introductionRationale: parsed.introductionRationale || protocol.introductionRationale,
          backgroundContext: parsed.backgroundContext || protocol.backgroundContext,
          knowledgeGap: parsed.knowledgeGap || protocol.knowledgeGap,
          primaryResearchQuestions: Array.isArray(parsed.primaryResearchQuestions) && parsed.primaryResearchQuestions.length > 0
            ? parsed.primaryResearchQuestions
            : protocol.primaryResearchQuestions || [],
          secondaryObjectives: Array.isArray(parsed.secondaryObjectives) && parsed.secondaryObjectives.length > 0
            ? parsed.secondaryObjectives
            : protocol.secondaryObjectives || [],
          objectivesPICO: {
            population: parsed.population || protocol.objectivesPICO.population,
            intervention: parsed.intervention || protocol.objectivesPICO.intervention,
            comparator: parsed.comparator || protocol.objectivesPICO.comparator,
            outcomes: parsed.outcomes || protocol.objectivesPICO.outcomes,
            studyDesigns: parsed.studyDesigns || protocol.objectivesPICO.studyDesigns,
          },
          eligibilityCriteria: {
            ...protocol.eligibilityCriteria,
            inclusion: Array.isArray(parsed.inclusion) && parsed.inclusion.length > 0
              ? parsed.inclusion
              : protocol.eligibilityCriteria.inclusion,
            exclusion: Array.isArray(parsed.exclusion) && parsed.exclusion.length > 0
              ? parsed.exclusion
              : protocol.eligibilityCriteria.exclusion,
            groupingForSynthesis: parsed.groupingForSynthesis || protocol.eligibilityCriteria.groupingForSynthesis,
          },
        });
      }
    } catch (err) {
      console.error(err);
      handleHeuristicDraft();
    }
    setGeneratingAll(false);
  };

  const handleHeuristicDraft = () => {
    const t = protocol.title.trim() || "Target Research Topic";
    onUpdateProtocol({
      ...protocol,
      introductionRationale: `${t} represents a critical subject of inquiry across contemporary literature. Despite an expanding volume of primary empirical investigations, reported findings exhibit notable variations in methodological rigor, intervention architectures, cohort demographics, and measured outcome metrics. Existing reviews either remain outdated, rely on restricted sample scopes, or fail to systematically evaluate methodological risk of bias under standardized reporting frameworks. Therefore, this systematic literature review is conducted in accordance with PRISMA 2020 to synthesize cumulative evidence, quantify comparative effect sizes, and establish robust evidence-based benchmarks.`,
      backgroundContext: `Comprehensive investigation into ${t} to establish current baselines, practical implications, and emerging methodologies.`,
      knowledgeGap: `Inconsistent findings, fragmented sub-methodologies, and lack of standardized quality appraisal across existing studies on ${t}.`,
      primaryResearchQuestions: [
        `RQ1 (Primary Efficacy/Effect): What is the cumulative effect, accuracy, or performance of the primary focus in ${t}?`,
        `RQ2 (Comparative Performance): How does the primary approach perform relative to conventional baselines and comparator standards?`,
        `RQ3 (Methodological Bias & Generalizability): What key methodological characteristics and risk-of-bias domains moderate outcomes across settings?`,
      ],
      secondaryObjectives: [
        `Evaluate subgroup variations across demographic and methodological strata`,
        `Grade the certainty of evidence for primary outcomes using the GRADE framework`,
      ],
    });
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const current = protocol.primaryResearchQuestions || [];
    onUpdateProtocol({
      ...protocol,
      primaryResearchQuestions: [...current, newQuestion.trim()],
    });
    setNewQuestion("");
  };

  const removeQuestion = (idx: number) => {
    const current = protocol.primaryResearchQuestions || [];
    onUpdateProtocol({
      ...protocol,
      primaryResearchQuestions: current.filter((_, i) => i !== idx),
    });
  };

  const addObjective = () => {
    if (!newObjective.trim()) return;
    const current = protocol.secondaryObjectives || [];
    onUpdateProtocol({
      ...protocol,
      secondaryObjectives: [...current, newObjective.trim()],
    });
    setNewObjective("");
  };

  const removeObjective = (idx: number) => {
    const current = protocol.secondaryObjectives || [];
    onUpdateProtocol({
      ...protocol,
      secondaryObjectives: current.filter((_, i) => i !== idx),
    });
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

  const questions = protocol.primaryResearchQuestions || [
    "RQ1: What is the cumulative effect, accuracy, or performance of the primary focus across included studies?",
    "RQ2: How do comparative approaches or sub-methodologies perform against baseline benchmarks?",
    "RQ3: What sources of methodological heterogeneity or bias influence outcomes across study settings?",
  ];

  const objectives = protocol.secondaryObjectives || [
    "Evaluate subgroup variations across demographic and methodological strata",
    "Assess certainty of cumulative evidence using the GRADE framework",
  ];

  return (
    <div id="methods-protocol-container" className="space-y-6">
      {/* Top Review Title & Metadata */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Item 1 & 24a · ROSES Item 1
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Review Title, Methodology & Registration
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleHeuristicDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Apply quick structured template"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Quick Template
            </button>
            <button
              onClick={handleAiAutoDraftAll}
              disabled={generatingAll || !protocol.title.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {generatingAll ? "Synthesizing Rationale & Objectives..." : "AI Auto-Draft Rationale & Objectives"}
            </button>
          </div>
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
              className="w-full text-sm font-sans p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
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
              <option>Environmental Evidence Synthesis (ROSES)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
            Protocol Registration & Repository Link (PRISMA Item 24a / ROSES Item 1)
          </label>
          <input
            type="text"
            value={protocol.protocolRegistration || ""}
            onChange={(e) => onUpdateProtocol({ ...protocol, protocolRegistration: e.target.value })}
            placeholder="e.g. PROSPERO Registration ID: CRD42026884129 · Open Science Framework (osf.io/xxxx) / PROCEED registry"
            className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
        </div>
      </div>

      {/* SECTION 1: PRISMA Item 3 - RATIONALE & BACKGROUND */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div>
          <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
            PRISMA 2020 Item 3 · ROSES Item 3
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Introduction: Rationale & Background Context
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Describe the rationale for the review in the context of what is already known, problem magnitude, existing literature gaps, and why a systematic synthesis is warranted.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-semibold text-slate-700">
              Domain Background & Problem Significance
            </label>
            <textarea
              rows={3}
              value={protocol.backgroundContext || ""}
              onChange={(e) => onUpdateProtocol({ ...protocol, backgroundContext: e.target.value })}
              placeholder="Contextualize the scientific, clinical, environmental, or technological problem..."
              className="w-full text-xs font-sans p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-semibold text-slate-700">
              Knowledge Gap & Synthesis Justification
            </label>
            <textarea
              rows={3}
              value={protocol.knowledgeGap || ""}
              onChange={(e) => onUpdateProtocol({ ...protocol, knowledgeGap: e.target.value })}
              placeholder="What controversies, inconsistencies, or lack of pooled evidence justify this new review?..."
              className="w-full text-xs font-sans p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 leading-relaxed"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-mono font-semibold text-slate-700">
            Full Drafted Rationale (Item 3 Manuscript Section)
          </label>
          <textarea
            rows={5}
            value={protocol.introductionRationale || ""}
            onChange={(e) => onUpdateProtocol({ ...protocol, introductionRationale: e.target.value })}
            placeholder="Complete multi-paragraph academic rationale for the Introduction section..."
            className="w-full text-xs font-sans p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 leading-relaxed"
          />
        </div>
      </div>

      {/* SECTION 2: PRISMA Item 4 - OBJECTIVES & RESEARCH QUESTIONS */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div>
          <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
            PRISMA 2020 Item 4 · ROSES Item 4
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Explicit Objectives & Research Questions (PICO / PECO Framework)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Provide an explicit statement of the question(s) the review addresses with reference to participants, interventions/exposures, comparators, and outcomes.
          </p>
        </div>

        {/* Primary Research Questions */}
        <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Explicit Research Questions ({questions.length})
            </span>
          </div>
          <div className="space-y-2">
            {questions.map((rq, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 shadow-2xs">
                <span className="font-medium text-slate-800 leading-snug">{rq}</span>
                <button
                  onClick={() => removeQuestion(idx)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuestion()}
              placeholder="e.g. RQ4: What is the comparative cost-effectiveness or implementation feasibility?..."
              className="flex-1 text-xs font-sans p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
            <button
              onClick={addQuestion}
              className="px-3 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              Add Question
            </button>
          </div>
        </div>

        {/* Secondary Objectives */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              Secondary Objectives & Subgroup Aims ({objectives.length})
            </span>
          </div>
          <div className="space-y-2">
            {objectives.map((obj, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-2xs">
                <span>• {obj}</span>
                <button
                  onClick={() => removeObjective(idx)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addObjective()}
              placeholder="Add secondary objective (e.g., meta-regression, sensitivity analysis)..."
              className="flex-1 text-xs font-sans p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-800"
            />
            <button
              onClick={addObjective}
              className="px-3 py-1.5 text-xs font-mono font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              Add Objective
            </button>
          </div>
        </div>

        {/* PICO Grid */}
        <div className="space-y-2 pt-2">
          <div className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wider">
            Structured PICO / PECO Criteria Breakdown
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
              <div className="font-mono text-xs font-bold text-indigo-700">
                P · Population / Participants / Subjects
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
                I / E · Intervention / Exposure / Technology
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
                C · Comparator / Baseline Standard
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

import React, { useState } from "react";
import { DiscussionSections, SLRProtocol, SynthesisResult } from "../types/slr";
import { Sparkles, BookOpen, Download, Copy, Check } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface DiscussionSectionProps {
  discussion: DiscussionSections;
  onUpdateDiscussion: (disc: DiscussionSections) => void;
  protocol: SLRProtocol;
  synthesis: SynthesisResult;
  aiConfig: any;
}

export default function DiscussionSection({
  discussion,
  onUpdateDiscussion,
  protocol,
  synthesis,
  aiConfig,
}: DiscussionSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateDiscussion = async () => {
    setGenerating(true);
    const prompt = `Following the 4 distinct PRISMA 2020 Discussion items (Items 23a–23d), draft an academic discussion section for:
Title: "${protocol.title}"
Synthesis findings summary: ${JSON.stringify(synthesis.subtopics.map((s) => s.title))}

Structure your response into 4 distinct parts:
1. item23aGeneralInterpretation: Provide a general interpretation of the results in the context of other evidence and existing clinical paradigms (PRISMA Item 23a).
2. item23bLimitationsOfEvidence: Discuss limitations of the included primary evidence (e.g. risk of bias, heterogeneity, retrospective EHR reliance, lack of external geographic validation) (PRISMA Item 23b).
3. item23cLimitationsOfReviewProcess: Discuss limitations of the review processes used (e.g. English-only restriction, non-indexed grey literature exclusion, publication bias) (PRISMA Item 23c).
4. item23dImplications: Discuss actionable implications of the results for clinical practice, healthcare policy, and future prospective algorithmic research (PRISMA Item 23d).

Return ONLY a JSON object:
{
  "item23aGeneralInterpretation": "...",
  "item23bLimitationsOfEvidence": "...",
  "item23cLimitationsOfReviewProcess": "...",
  "item23dImplications": "..."
}`;

    try {
      const text = await callAI(prompt, "You are a senior medical journal editor and PRISMA reviewer.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (parsed) {
        onUpdateDiscussion({
          item23aGeneralInterpretation: parsed.item23aGeneralInterpretation || discussion.item23aGeneralInterpretation,
          item23bLimitationsOfEvidence: parsed.item23bLimitationsOfEvidence || discussion.item23bLimitationsOfEvidence,
          item23cLimitationsOfReviewProcess: parsed.item23cLimitationsOfReviewProcess || discussion.item23cLimitationsOfReviewProcess,
          item23dImplications: parsed.item23dImplications || discussion.item23dImplications,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const copyFullDiscussion = () => {
    const text = `## Discussion\n\n### 23a. General Interpretation of Results in Context\n${discussion.item23aGeneralInterpretation}\n\n### 23b. Limitations of Included Evidence\n${discussion.item23bLimitationsOfEvidence}\n\n### 23c. Limitations of Review Process\n${discussion.item23cLimitationsOfReviewProcess}\n\n### 23d. Implications for Practice, Policy, and Research\n${discussion.item23dImplications}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="discussion-section-container" className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 23a, 23b, 23c & 23d
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Structured 4-Part Discussion Section
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Complete academic discussion divided into general interpretation (23a), evidence limitations (23b), review process limitations (23c), and practice/policy implications (23d).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateDiscussion}
              disabled={generating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {generating ? "Drafting Discussion..." : "AI Generate PRISMA Discussion"}
            </button>
            <button
              onClick={copyFullDiscussion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Discussion"}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Discussion Blocks */}
      <div className="space-y-4">
        {/* Item 23a */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Item 23a · General Interpretation of Results in Context of Other Evidence
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 4.1</span>
          </div>
          <textarea
            rows={5}
            value={discussion.item23aGeneralInterpretation}
            onChange={(e) =>
              onUpdateDiscussion({ ...discussion, item23aGeneralInterpretation: e.target.value })
            }
            className="w-full text-xs text-slate-700 font-sans leading-relaxed border border-slate-200 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Item 23b */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Item 23b · Limitations of the Included Evidence
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 4.2</span>
          </div>
          <textarea
            rows={4}
            value={discussion.item23bLimitationsOfEvidence}
            onChange={(e) =>
              onUpdateDiscussion({ ...discussion, item23bLimitationsOfEvidence: e.target.value })
            }
            className="w-full text-xs text-slate-700 font-sans leading-relaxed border border-slate-200 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Item 23c */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Item 23c · Limitations of the Review Processes Used
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 4.3</span>
          </div>
          <textarea
            rows={4}
            value={discussion.item23cLimitationsOfReviewProcess}
            onChange={(e) =>
              onUpdateDiscussion({ ...discussion, item23cLimitationsOfReviewProcess: e.target.value })
            }
            className="w-full text-xs text-slate-700 font-sans leading-relaxed border border-slate-200 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Item 23d */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Item 23d · Implications of Results for Practice, Policy, and Future Research
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 4.4</span>
          </div>
          <textarea
            rows={5}
            value={discussion.item23dImplications}
            onChange={(e) =>
              onUpdateDiscussion({ ...discussion, item23dImplications: e.target.value })
            }
            className="w-full text-xs text-slate-700 font-sans leading-relaxed border border-slate-200 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { SLRRecord, ScreeningDecision, SLRProtocol } from "../types/slr";
import { Sparkles, Check, X, Filter, Search, FileX, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface ScreeningSectionProps {
  records: SLRRecord[];
  screening: Record<string, ScreeningDecision>;
  onUpdateScreening: (screening: Record<string, ScreeningDecision>) => void;
  protocol: SLRProtocol;
  aiConfig: any;
}

export default function ScreeningSection({
  records,
  screening,
  onUpdateScreening,
  protocol,
  aiConfig,
}: ScreeningSectionProps) {
  const [runningScreening, setRunningScreening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "included" | "excluded" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const includedCount = records.filter((r) => screening[r.id]?.agreed === true).length;
  const excludedCount = records.filter((r) => screening[r.id]?.agreed === false).length;
  const pendingCount = records.filter((r) => screening[r.id]?.agreed === undefined).length;

  const runAIScreening = async () => {
    if (records.length === 0) return;
    setRunningScreening(true);
    setProgress(0);

    const batchSize = 5;
    const totalBatches = Math.ceil(records.length / batchSize);

    const nextScreening = { ...screening };

    for (let b = 0; b < totalBatches; b++) {
      const batch = records.slice(b * batchSize, (b + 1) * batchSize);
      const payload = batch.map((r) => ({
        id: r.id,
        title: r.title,
        abstract: (r.abstract || "").slice(0, 600),
      }));

      const prompt = `Review title: "${protocol.title}"
Inclusion criteria: ${protocol.eligibilityCriteria.inclusion.join("; ")}
Exclusion criteria: ${protocol.eligibilityCriteria.exclusion.join("; ")}

For each record below, estimate a relevance score (0-100) and provide a concise reason explaining whether it meets the PICO eligibility criteria for full-text inclusion.
If score < 80, identify the primary exclusion reason category: "Wrong population" | "Wrong intervention / exposure" | "Wrong comparator" | "Wrong outcome" | "Wrong study design" | "Not accessible / full text unavailable" | "Other".

Records:
${JSON.stringify(payload)}

Return ONLY a JSON array:
[
  {
    "id": "...",
    "score": 90,
    "reason": "...",
    "exclusionReason": "Wrong population" (optional)
  }
]`;

      try {
        const text = await callAI(
          prompt,
          "You are an expert medical librarian and systematic review screener following PRISMA 2020 Item 8 standards.",
          aiConfig
        );
        const parsed = parseJSONLoose(text);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            const isInclude = p.score >= (protocol.selectionProcess.screeningThreshold || 80);
            nextScreening[p.id] = {
              score: p.score,
              reason: p.reason || (isInclude ? "Meets PICO criteria" : "Does not meet criteria"),
              decision: isInclude ? "include" : "exclude",
              agreed: isInclude,
              exclusionReason: !isInclude ? p.exclusionReason || "Wrong study design" : undefined,
            };
          });
        }
      } catch (err) {
        console.error(err);
      }

      setProgress(Math.round(((b + 1) / totalBatches) * 100));
      onUpdateScreening({ ...nextScreening });
    }

    setRunningScreening(false);
  };

  const handleSetDecision = (id: string, agree: boolean, reason?: ScreeningDecision["exclusionReason"]) => {
    const existing = screening[id] || { score: null, reason: "Manual human evaluation", decision: agree ? "include" : "exclude" };
    onUpdateScreening({
      ...screening,
      [id]: {
        ...existing,
        agreed: agree,
        decision: agree ? "include" : "exclude",
        exclusionReason: !agree ? reason || existing.exclusionReason || "Wrong study design" : undefined,
      },
    });
  };

  const handleBulkIncludeHigh = () => {
    const next = { ...screening };
    records.forEach((r) => {
      if ((next[r.id]?.score || 0) >= 80) {
        next[r.id] = { ...next[r.id], agreed: true };
      }
    });
    onUpdateScreening(next);
  };

  const handleBulkExcludeLow = () => {
    const next = { ...screening };
    records.forEach((r) => {
      if ((next[r.id]?.score || 0) < 80) {
        next[r.id] = {
          ...next[r.id],
          agreed: false,
          exclusionReason: next[r.id]?.exclusionReason || "Wrong study design",
        };
      }
    });
    onUpdateScreening(next);
  };

  const filteredRecords = records.filter((r) => {
    const dec = screening[r.id];
    if (activeTab === "included" && dec?.agreed !== true) return false;
    if (activeTab === "excluded" && dec?.agreed !== false) return false;
    if (activeTab === "pending" && dec?.agreed !== undefined) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.authors.some((a) => a.toLowerCase().includes(q)) ||
        (r.abstract || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div id="screening-section-container" className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 8, 16a & 16b
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              AI & Dual-Reviewer Study Selection & Exclusions Tracking
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Screen records against PICO criteria with AI scoring (Item 8) and document exact reasons for all excluded studies (Item 16b).
            </p>
          </div>

          <button
            onClick={runAIScreening}
            disabled={runningScreening || records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            {runningScreening ? `Screening (${progress}%)...` : "Run Automated AI Screening"}
          </button>
        </div>

        {/* Progress bar if running */}
        {runningScreening && (
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div style={{ width: `${progress}%` }} className="bg-indigo-600 h-full transition-all duration-300" />
          </div>
        )}

        {/* Quick bulk actions */}
        {Object.keys(screening).length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBulkIncludeHigh}
                className="px-3 py-1.5 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
              >
                Include All ≥80% Matches
              </button>
              <button
                onClick={handleBulkExcludeLow}
                className="px-3 py-1.5 text-xs font-mono text-rose-800 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
              >
                Exclude All &lt;80% Matches
              </button>
            </div>

            <div className="font-mono text-xs text-slate-800 flex items-center gap-3">
              <span className="text-emerald-700 font-semibold">{includedCount} Included</span>
              <span className="text-rose-700 font-semibold">{excludedCount} Excluded</span>
              <span className="text-slate-500">{pendingCount} Pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs and Search */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "all", label: `All Records (${records.length})` },
              { key: "included", label: `Included (${includedCount})` },
              { key: "excluded", label: `Excluded (Item 16b) (${excludedCount})` },
              { key: "pending", label: `Pending (${pendingCount})` },
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

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search in title or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-mono pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center rounded-xl text-xs font-mono text-slate-500">
            No records matching current tab or search filter.
          </div>
        ) : (
          filteredRecords.map((r) => {
            const s = screening[r.id];
            const isIncluded = s?.agreed === true;
            const isExcluded = s?.agreed === false;
            const isExpanded = expandedId === r.id;

            return (
              <div
                key={r.id}
                className={`border rounded-xl p-5 transition-all shadow-xs ${
                  isIncluded
                    ? "bg-emerald-50/20 border-emerald-300"
                    : isExcluded
                    ? "bg-rose-50/20 border-rose-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {s?.score !== undefined && s.score !== null && (
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            s.score >= 80
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-rose-50 border-rose-200 text-rose-800"
                          }`}
                        >
                          {s.score}% PICO Match
                        </span>
                      )}
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {r.databaseSource || "Database"}
                      </span>
                      {r.year && (
                        <span className="font-mono text-[10px] text-slate-500">
                          Year: {r.year}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {r.title}
                    </h3>
                    <div className="text-xs text-slate-500 font-sans mt-0.5">
                      {(r.authors || []).join(", ")} · <em>{r.source || "Journal Source"}</em>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSetDecision(r.id, true)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer shadow-2xs ${
                        isIncluded
                          ? "bg-emerald-700 text-white font-bold"
                          : "bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Include
                    </button>
                    <button
                      onClick={() => handleSetDecision(r.id, false)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer shadow-2xs ${
                        isExcluded
                          ? "bg-rose-700 text-white font-bold"
                          : "bg-white border border-rose-300 text-rose-700 hover:bg-rose-50"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Exclude
                    </button>
                  </div>
                </div>

                {/* AI Justification & Exclusion Reason selector */}
                {s && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-sans space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[11px] font-bold text-indigo-700 shrink-0">
                        AI Reasoning:
                      </span>
                      <span className="text-slate-700">{s.reason}</span>
                    </div>

                    {isExcluded && (
                      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg">
                        <span className="font-mono text-[11px] font-bold text-rose-800 shrink-0">
                          PRISMA Item 16b Exclusion Reason:
                        </span>
                        <select
                          value={s.exclusionReason || "Wrong study design"}
                          onChange={(e) => handleSetDecision(r.id, false, e.target.value as any)}
                          className="text-xs font-mono p-1 border border-rose-300 rounded bg-white text-rose-800 font-semibold"
                        >
                          <option value="Wrong population">Wrong population</option>
                          <option value="Wrong intervention / exposure">Wrong intervention / exposure</option>
                          <option value="Wrong comparator">Wrong comparator</option>
                          <option value="Wrong outcome">Wrong outcome</option>
                          <option value="Wrong study design">Wrong study design</option>
                          <option value="Not accessible / full text unavailable">Not accessible / full text unavailable</option>
                          <option value="Duplicate / non-original">Duplicate / non-original</option>
                          <option value="Language barrier">Language barrier</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Abstract Accordion */}
                {r.abstract && (
                  <div className="mt-2.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="text-[11px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Hide Abstract" : "View Full Abstract"}
                    </button>
                    {isExpanded && (
                      <p className="mt-2 text-xs text-slate-700 bg-slate-50/80 p-3.5 rounded-lg leading-relaxed border border-slate-200">
                        {r.abstract}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

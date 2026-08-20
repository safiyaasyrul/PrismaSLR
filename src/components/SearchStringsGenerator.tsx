import React, { useState } from "react";
import { SLRProtocol } from "../types/slr";
import { Copy, Check, Sparkles, Database, Calendar } from "lucide-react";
import { callAI, parseJSONLoose } from "../utils/aiClient";

interface SearchStringsGeneratorProps {
  protocol: SLRProtocol;
  onUpdateProtocol: (protocol: SLRProtocol) => void;
  aiConfig: any;
}

export default function SearchStringsGenerator({
  protocol,
  onUpdateProtocol,
  aiConfig,
}: SearchStringsGeneratorProps) {
  // Generate dynamic keywords based on protocol title and PICO
  const getInitialKeywords = () => {
    const terms: string[] = [];
    if (protocol.title) {
      const words = protocol.title
        .replace(/[:,\(\)\-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["systematic", "literature", "review", "meta", "analysis", "evidence", "synthesis"].includes(w.toLowerCase()));
      terms.push(...words.slice(0, 4));
    }
    if (protocol.objectivesPICO.population) {
      terms.push(protocol.objectivesPICO.population);
    }
    if (protocol.objectivesPICO.intervention) {
      terms.push(protocol.objectivesPICO.intervention);
    }
    if (protocol.objectivesPICO.outcomes) {
      terms.push(protocol.objectivesPICO.outcomes);
    }

    const unique = Array.from(new Set(terms.filter((t) => t && t.trim().length > 0)));
    if (unique.length === 0) {
      return [
        { term: "systematic review", selected: true },
        { term: "empirical evaluation", selected: true },
        { term: "comparative study", selected: true },
        { term: "validation benchmark", selected: true },
      ];
    }
    return unique.map((term) => ({ term, selected: true }));
  };

  const [keywords, setKeywords] = useState<{ term: string; selected: boolean }[]>(getInitialKeywords);
  const [customKeyword, setCustomKeyword] = useState("");
  const [loadingKw, setLoadingKw] = useState(false);
  const [loadingStrings, setLoadingStrings] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [yearFrom, setYearFrom] = useState(2019);
  const [yearTo, setYearTo] = useState(2026);
  const [docType, setDocType] = useState("Journal article");
  const [language, setLanguage] = useState("English");

  const toggleKeyword = (idx: number) => {
    setKeywords((prev) => prev.map((k, i) => (i === idx ? { ...k, selected: !k.selected } : k)));
  };

  const addCustomKeyword = () => {
    if (!customKeyword.trim()) return;
    setKeywords((prev) => [...prev, { term: customKeyword.trim(), selected: true }]);
    setCustomKeyword("");
  };

  const handleSuggestKeywords = async () => {
    if (!protocol.title.trim()) return;
    setLoadingKw(true);
    try {
      const prompt = `Systematic Review Title: "${protocol.title}"
Review Type: "${protocol.reviewType}"
PICO Population / Context: "${protocol.objectivesPICO.population}"
PICO Intervention / Exposure: "${protocol.objectivesPICO.intervention}"
PICO Comparator: "${protocol.objectivesPICO.comparator}"
PICO Outcomes: "${protocol.objectivesPICO.outcomes}"

Suggest 12-16 academic keywords, synonyms, controlled vocabulary terms (MeSH, Emtree, Inspec, or Environmental thesauri), and technical phrasing tailored for building Boolean search queries across Scopus, Web of Science, PubMed, and IEEE Xplore adhering to PRISMA-S Item 7 and PRISMA 2020 Item 7.
Return ONLY a JSON array of strings: ["term 1", "term 2", ...]. No preamble.`;
      const text = await callAI(prompt, "You are an expert research librarian and PRISMA-S search string engineer.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setKeywords(parsed.map((t: string) => ({ term: t, selected: true })));
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingKw(false);
  };

  const handleGenerateStrings = async () => {
    setLoadingStrings(true);
    try {
      const selected = keywords.filter((k) => k.selected).map((k) => k.term);
      const prompt = `Title: "${protocol.title}"
Selected keywords: ${selected.join(", ")}
Filters: Years ${yearFrom}-${yearTo}, Document Type "${docType}", Language "${language}".

Generate exact, reproducible Boolean search syntax strings tailored for each database adhering to PRISMA 2020 Item 7:
1. Scopus: Use TITLE-ABS-KEY syntax with parentheses for OR and AND, plus PUBYEAR and DOCTYPE limits.
2. Web of Science: Use TS= topic field tags with PY= and DT= filters.
3. PubMed / MEDLINE: Use [Title/Abstract] and [MeSH Terms] syntax with Date limits.
4. Google Scholar / IEEE Xplore: Use standard quoted Boolean OR/AND syntax.

Return ONLY a JSON array of objects:
[
  { "database": "Scopus", "query": "...", "filters": "Years ${yearFrom}-${yearTo}, Article, English" },
  { "database": "Web of Science", "query": "...", "filters": "Years ${yearFrom}-${yearTo}, Article/Proceedings, English" },
  { "database": "PubMed", "query": "...", "filters": "Years ${yearFrom}-${yearTo}, Humans, English" },
  { "database": "Google Scholar", "query": "...", "filters": "Years ${yearFrom}-${yearTo}, English" },
  { "database": "IEEE Xplore", "query": "...", "filters": "Years ${yearFrom}-${yearTo}, Conference & Journals" }
]`;

      const text = await callAI(prompt, "You are a professional search string engineer for systematic reviews.", aiConfig);
      const parsed = parseJSONLoose(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateProtocol({
          ...protocol,
          searchStrategies: parsed,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingStrings(false);
  };

  const copyString = (db: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedKey(db);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const updateSourceDate = (dbName: string, date: string) => {
    const existing = protocol.informationSources.find((s) => s.name.toLowerCase().includes(dbName.toLowerCase()));
    if (existing) {
      onUpdateProtocol({
        ...protocol,
        informationSources: protocol.informationSources.map((s) =>
          s.name.toLowerCase().includes(dbName.toLowerCase()) ? { ...s, lastSearchedDate: date } : s
        ),
      });
    } else {
      onUpdateProtocol({
        ...protocol,
        informationSources: [
          ...protocol.informationSources,
          { name: dbName, lastSearchedDate: date, urlOrHost: `${dbName.toLowerCase().replace(/\s+/g, "")}.com`, recordsRetrieved: 0 },
        ],
      });
    }
  };

  return (
    <div id="search-strings-container" className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 6 & 7
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Information Sources & Full Search Strategies
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Present reproducible Boolean search strategies with specific field codes and track consultation dates across academic databases.
            </p>
          </div>

          <button
            onClick={handleSuggestKeywords}
            disabled={loadingKw || !protocol.title.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            {loadingKw ? "Suggesting Keywords..." : "AI Suggest Keywords"}
          </button>
        </div>

        {/* Keyword Pills */}
        <div>
          <label className="block text-xs font-mono text-slate-500 mb-1.5">
            Keywords & Phrasing (Tap to include/exclude in search string formulation):
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {keywords.map((k, i) => (
              <button
                key={i}
                onClick={() => toggleKeyword(i)}
                className={`text-xs font-mono px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  k.selected
                    ? "bg-indigo-50 border-indigo-200 text-indigo-800 font-semibold shadow-2xs"
                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                }`}
              >
                {k.term}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomKeyword()}
              placeholder="Add custom keyword or MeSH term..."
              className="flex-1 text-xs font-mono p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
            <button
              onClick={addCustomKeyword}
              className="px-3.5 py-1.5 text-xs font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Filters Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1">Year Range (From)</label>
            <input
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(parseInt(e.target.value) || 2019)}
              className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1">Year Range (To)</label>
            <input
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(parseInt(e.target.value) || 2026)}
              className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option>Journal article</option>
              <option>Article OR Conference Paper</option>
              <option>Review OR Article</option>
              <option>Any</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option>English</option>
              <option>English OR Malay</option>
              <option>Any</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleGenerateStrings}
            disabled={loadingStrings}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {loadingStrings ? "Synthesizing Database Queries..." : "Generate Database Search Strings (Item 7)"}
          </button>
        </div>
      </div>

      {/* Generated Search Strings Cards */}
      <div className="space-y-4">
        {protocol.searchStrategies.map((strat) => {
          const sourceInfo = protocol.informationSources.find((s) =>
            s.name.toLowerCase().includes(strat.database.toLowerCase())
          );
          const lastDate = sourceInfo?.lastSearchedDate || "2026-08-16";

          return (
            <div
              key={strat.database}
              className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                    {strat.database} Search Strategy
                  </span>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {strat.filters}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last searched (Item 6):</span>
                    <input
                      type="date"
                      value={lastDate}
                      onChange={(e) => updateSourceDate(strat.database, e.target.value)}
                      className="p-1 text-[11px] font-mono border border-slate-200 rounded-md bg-white text-slate-700"
                    />
                  </div>

                  <button
                    onClick={() => copyString(strat.database, strat.query)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedKey === strat.database ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy String</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code display */}
              <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-indigo-600">
                {strat.query}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

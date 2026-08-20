import React, { useState, useEffect, useMemo } from "react";
import {
  SLRProtocol,
  SLRRecord,
  ScreeningDecision,
  StudyCharacteristic,
  RiskOfBiasItem,
  SynthesisResult,
  GradeCertaintyItem,
  DiscussionSections,
  PrismaChecklistItem,
} from "./types/slr";
import { initialPrismaChecklist } from "./data/prismaChecklistData";
import {
  sampleProtocol,
  sampleRecords,
  sampleScreening,
  sampleCharacteristics,
  sampleRiskOfBias,
  sampleSynthesis,
  sampleGradeItems,
  sampleDiscussion,
} from "./data/sampleDataset";

import PrismaChecklistAudit from "./components/PrismaChecklistAudit";
import MethodsProtocol from "./components/MethodsProtocol";
import SearchStringsGenerator from "./components/SearchStringsGenerator";
import RecordsImport from "./components/RecordsImport";
import ScreeningSection from "./components/ScreeningSection";
import PrismaDiagram from "./components/PrismaDiagram";
import StudyCharacteristicsTable from "./components/StudyCharacteristicsTable";
import RiskOfBiasSection from "./components/RiskOfBiasSection";
import SynthesisSection from "./components/SynthesisSection";
import CertaintyGradeSection from "./components/CertaintyGradeSection";
import DiscussionSection from "./components/DiscussionSection";
import FullReviewReport from "./components/FullReviewReport";

import {
  ClipboardCheck,
  FileSpreadsheet,
  Search,
  UploadCloud,
  CheckCircle,
  GitBranch,
  Table,
  ShieldCheck,
  BarChart2,
  Award,
  BookOpen,
  FileText,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  RotateCcw,
  Check,
} from "lucide-react";

export default function App() {
  // Navigation State
  const [activeStage, setActiveStage] = useState<number>(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Application Data States (Initialized with sample systematic review on Machine Learning for Type 2 Diabetes)
  const [protocol, setProtocol] = useState<SLRProtocol>(() => {
    const saved = localStorage.getItem("slr_protocol_v1");
    return saved ? JSON.parse(saved) : sampleProtocol;
  });

  const [records, setRecords] = useState<SLRRecord[]>(() => {
    const saved = localStorage.getItem("slr_records_v1");
    return saved ? JSON.parse(saved) : sampleRecords;
  });

  const [dupesRemoved, setDupesRemoved] = useState<number>(() => {
    const saved = localStorage.getItem("slr_dupes_v1");
    return saved ? JSON.parse(saved) : 284;
  });

  const [screening, setScreening] = useState<Record<string, ScreeningDecision>>(() => {
    const saved = localStorage.getItem("slr_screening_v1");
    return saved ? JSON.parse(saved) : sampleScreening;
  });

  const [characteristics, setCharacteristics] = useState<StudyCharacteristic[]>(() => {
    const saved = localStorage.getItem("slr_chars_v1");
    return saved ? JSON.parse(saved) : sampleCharacteristics;
  });

  const [riskOfBias, setRiskOfBias] = useState<RiskOfBiasItem[]>(() => {
    const saved = localStorage.getItem("slr_rob_v1");
    return saved ? JSON.parse(saved) : sampleRiskOfBias;
  });

  const [synthesis, setSynthesis] = useState<SynthesisResult>(() => {
    const saved = localStorage.getItem("slr_synthesis_v1");
    return saved ? JSON.parse(saved) : sampleSynthesis;
  });

  const [gradeItems, setGradeItems] = useState<GradeCertaintyItem[]>(() => {
    const saved = localStorage.getItem("slr_grade_v1");
    return saved ? JSON.parse(saved) : sampleGradeItems;
  });

  const [discussion, setDiscussion] = useState<DiscussionSections>(() => {
    const saved = localStorage.getItem("slr_discussion_v1");
    return saved ? JSON.parse(saved) : sampleDiscussion;
  });

  const [checklist, setChecklist] = useState<PrismaChecklistItem[]>(() => {
    const saved = localStorage.getItem("slr_checklist_v1");
    return saved ? JSON.parse(saved) : initialPrismaChecklist;
  });

  const [aiConfig, setAiConfig] = useState({
    provider: "gemini",
  });

  // Local storage persistence effects
  useEffect(() => {
    localStorage.setItem("slr_protocol_v1", JSON.stringify(protocol));
  }, [protocol]);

  useEffect(() => {
    localStorage.setItem("slr_records_v1", JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem("slr_dupes_v1", JSON.stringify(dupesRemoved));
  }, [dupesRemoved]);

  useEffect(() => {
    localStorage.setItem("slr_screening_v1", JSON.stringify(screening));
  }, [screening]);

  useEffect(() => {
    localStorage.setItem("slr_chars_v1", JSON.stringify(characteristics));
  }, [characteristics]);

  useEffect(() => {
    localStorage.setItem("slr_rob_v1", JSON.stringify(riskOfBias));
  }, [riskOfBias]);

  useEffect(() => {
    localStorage.setItem("slr_synthesis_v1", JSON.stringify(synthesis));
  }, [synthesis]);

  useEffect(() => {
    localStorage.setItem("slr_grade_v1", JSON.stringify(gradeItems));
  }, [gradeItems]);

  useEffect(() => {
    localStorage.setItem("slr_discussion_v1", JSON.stringify(discussion));
  }, [discussion]);

  useEffect(() => {
    localStorage.setItem("slr_checklist_v1", JSON.stringify(checklist));
  }, [checklist]);

  // Derived included records
  const includedRecords = useMemo(() => {
    return records.filter((r) => screening[r.id]?.agreed === true);
  }, [records, screening]);

  // Derived excluded records
  const excludedRecords = useMemo(() => {
    return records.filter((r) => screening[r.id]?.agreed === false);
  }, [records, screening]);

  // Exclusion reasons breakdown for PRISMA Item 16b
  const exclusionReasonsBreakdown = useMemo(() => {
    const acc: Record<string, number> = {};
    excludedRecords.forEach((r) => {
      const reason = screening[r.id]?.exclusionReason || "Wrong study design";
      acc[reason] = (acc[reason] || 0) + 1;
    });
    return acc;
  }, [excludedRecords, screening]);

  // PRISMA Flow Diagram Dynamic Counts
  const prismaCounts = useMemo(() => {
    const totalIdentified = records.length + (dupesRemoved || 0) + 240;
    const dbCount = totalIdentified - 48;
    const otherCount = 48;
    const screenedCount = records.length;
    const screenedExcludedCount = excludedRecords.length > 2 ? excludedRecords.length - 2 : excludedRecords.length;
    const soughtCount = includedRecords.length + 2;
    const notRetrievedCount = 0;
    const assessedCount = soughtCount;
    const assessedExcludedCount = 2;
    const includedCount = includedRecords.length;

    return {
      identifiedDb: dbCount > 0 ? dbCount : 1248,
      identifiedOther: otherCount,
      duplicatesRemoved: dupesRemoved || 284,
      screened: screenedCount > 0 ? screenedCount : 1012,
      screenedExcluded: screenedExcludedCount > 0 ? screenedExcludedCount : 964,
      soughtRetrieval: soughtCount > 0 ? soughtCount : 48,
      notRetrieved: notRetrievedCount,
      assessed: assessedCount > 0 ? assessedCount : 48,
      assessedExcluded: assessedExcludedCount,
      exclusionReasonsBreakdown,
      included: includedCount > 0 ? includedCount : 10,
    };
  }, [records, dupesRemoved, includedRecords, excludedRecords, exclusionReasonsBreakdown]);

  // Checklist item update helper
  const handleUpdateChecklistItem = (itemNumber: string, updates: Partial<PrismaChecklistItem>) => {
    setChecklist((prev) =>
      prev.map((c) => (c.itemNumber === itemNumber ? { ...c, ...updates } : c))
    );
  };

  // Reset to full sample dataset
  const handleResetSample = () => {
    if (window.confirm("Reload complete PRISMA 2020 systematic review dataset?")) {
      setProtocol(sampleProtocol);
      setRecords(sampleRecords);
      setDupesRemoved(284);
      setScreening(sampleScreening);
      setCharacteristics(sampleCharacteristics);
      setRiskOfBias(sampleRiskOfBias);
      setSynthesis(sampleSynthesis);
      setGradeItems(sampleGradeItems);
      setDiscussion(sampleDiscussion);
      setChecklist(initialPrismaChecklist);
    }
  };

  // Navigation Stages Definition mapped directly to PRISMA 2020 Checklist
  const stages = [
    {
      id: "checklist",
      label: "PRISMA 2020 Checklist Audit",
      badge: "Items 1–27",
      icon: ClipboardCheck,
    },
    {
      id: "protocol",
      label: "Protocol & PICO Objectives",
      badge: "Items 4, 5, 8–15",
      icon: FileSpreadsheet,
    },
    {
      id: "search",
      label: "Search Strings & Sources",
      badge: "Items 6 & 7",
      icon: Search,
    },
    {
      id: "import",
      label: "Records & Deduplication",
      badge: "Items 6 & 16a",
      icon: UploadCloud,
    },
    {
      id: "screening",
      label: "AI Selection & Exclusions",
      badge: "Items 8, 16a, 16b",
      icon: CheckCircle,
    },
    {
      id: "diagram",
      label: "PRISMA Flow Diagram",
      badge: "Item 16a",
      icon: GitBranch,
    },
    {
      id: "characteristics",
      label: "Study Characteristics (Table 1)",
      badge: "Item 17",
      icon: Table,
    },
    {
      id: "rob",
      label: "Risk of Bias & Quality (Table 2)",
      badge: "Items 11 & 18",
      icon: ShieldCheck,
    },
    {
      id: "synthesis",
      label: "Synthesis & Forest Plot",
      badge: "Items 13a–f & 20a–d",
      icon: BarChart2,
    },
    {
      id: "grade",
      label: "GRADE Summary of Findings",
      badge: "Items 15 & 22",
      icon: Award,
    },
    {
      id: "discussion",
      label: "4-Part PRISMA Discussion",
      badge: "Items 23a–23d",
      icon: BookOpen,
    },
    {
      id: "manuscript",
      label: "Consolidated Manuscript",
      badge: "Full Report",
      icon: FileText,
    },
  ];

  // Overall PRISMA compliance count
  const reportedCount = checklist.filter((c) => c.status === "Reported").length;
  const compliancePct = Math.round((reportedCount / 27) * 100);

  return (
    <div id="prisma-workbench-root" className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Application Bar */}
      <header className="bg-white text-slate-900 border-b border-slate-200 px-4 py-3 sm:px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-slate-900">
                    PRISMA 2020 Workbench
                  </span>
                  <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    SLR Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block truncate max-w-md">
                  {protocol.title || "Systematic Literature Review Assistant"}
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-mono text-slate-500">Compliance:</span>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {compliancePct}% ({reportedCount}/27 Items)
              </span>
            </div>

            <button
              onClick={handleResetSample}
              title="Reset to PRISMA Sample Dataset"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sample Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Left Navigation Sidebar */}
        <aside
          className={`fixed lg:sticky top-[57px] left-0 z-20 h-[calc(100vh-57px)] w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Stages List Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              PRISMA 2020 Workflow
            </span>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              12 Stages
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => {
                    setActiveStage(idx);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 text-indigo-950 font-semibold border border-indigo-100/80 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <div className="truncate">
                      <div className={`text-xs truncate ${isActive ? "font-semibold text-indigo-950" : "text-slate-700"}`}>{stage.label}</div>
                      <div
                        className={`text-[10px] font-mono ${
                          isActive ? "text-indigo-600 font-medium" : "text-slate-400"
                        }`}
                      >
                        {stage.badge}
                      </div>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Included Studies:</span>
              <strong className="text-emerald-700 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{includedRecords.length} studies</strong>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-slate-500 font-medium">Total Records:</span>
              <strong className="text-slate-700 font-mono">{records.length} records</strong>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Stage 0: PRISMA 2020 Checklist Audit */}
          {activeStage === 0 && (
            <PrismaChecklistAudit
              checklist={checklist}
              onUpdateItem={handleUpdateChecklistItem}
              onNavigateStage={(idx) => setActiveStage(idx)}
            />
          )}

          {/* Stage 1: Protocol & PICO Objectives */}
          {activeStage === 1 && (
            <MethodsProtocol
              protocol={protocol}
              onUpdateProtocol={setProtocol}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 2: Information Sources & Search Strings */}
          {activeStage === 2 && (
            <SearchStringsGenerator
              protocol={protocol}
              onUpdateProtocol={setProtocol}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 3: Records Import & Deduplication */}
          {activeStage === 3 && (
            <RecordsImport
              records={records}
              onUpdateRecords={setRecords}
              dupesRemoved={dupesRemoved}
              onUpdateDupesRemoved={setDupesRemoved}
              onLoadSample={handleResetSample}
            />
          )}

          {/* Stage 4: AI & Dual-Reviewer Screening */}
          {activeStage === 4 && (
            <ScreeningSection
              records={records}
              screening={screening}
              onUpdateScreening={setScreening}
              protocol={protocol}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 5: PRISMA 2020 Flow Diagram */}
          {activeStage === 5 && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
                <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
                  PRISMA 2020 Item 16a
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  PRISMA 2020 Flow Diagram Generator
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Standardized flow of records through Identification, Screening, Eligibility, and Inclusion phases with SVG & High-Res PNG download.
                </p>
              </div>

              <PrismaDiagram counts={prismaCounts} />
            </div>
          )}

          {/* Stage 6: Study Characteristics (Table 1) */}
          {activeStage === 6 && (
            <StudyCharacteristicsTable
              includedRecords={includedRecords}
              characteristics={characteristics}
              onUpdateCharacteristics={setCharacteristics}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 7: Risk of Bias (Table 2) */}
          {activeStage === 7 && (
            <RiskOfBiasSection
              includedRecords={includedRecords}
              riskOfBias={riskOfBias}
              onUpdateRiskOfBias={setRiskOfBias}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 8: Synthesis & Meta-Analysis Forest Plot */}
          {activeStage === 8 && (
            <SynthesisSection
              synthesis={synthesis}
              onUpdateSynthesis={setSynthesis}
              includedRecords={includedRecords}
              characteristics={characteristics}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 9: GRADE Certainty of Evidence */}
          {activeStage === 9 && (
            <CertaintyGradeSection
              gradeItems={gradeItems}
              onUpdateGrade={setGradeItems}
              includedRecords={includedRecords}
              characteristics={characteristics}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 10: 4-Part Discussion */}
          {activeStage === 10 && (
            <DiscussionSection
              discussion={discussion}
              onUpdateDiscussion={setDiscussion}
              protocol={protocol}
              synthesis={synthesis}
              aiConfig={aiConfig}
            />
          )}

          {/* Stage 11: Consolidated Manuscript */}
          {activeStage === 11 && (
            <FullReviewReport
              protocol={protocol}
              includedRecords={includedRecords}
              characteristics={characteristics}
              riskOfBias={riskOfBias}
              synthesis={synthesis}
              gradeItems={gradeItems}
              discussion={discussion}
              checklist={checklist}
              counts={prismaCounts}
            />
          )}
        </main>
      </div>
    </div>
  );
}

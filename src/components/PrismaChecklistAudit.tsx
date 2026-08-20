import React, { useState } from "react";
import { PrismaChecklistItem } from "../types/slr";
import { CheckCircle2, AlertTriangle, XCircle, Download, ExternalLink, Filter, FileSpreadsheet, FileText, Check } from "lucide-react";

interface PrismaChecklistAuditProps {
  checklist: PrismaChecklistItem[];
  onUpdateItem: (itemNumber: string, updates: Partial<PrismaChecklistItem>) => void;
  onNavigateStage?: (stageIndex: number) => void;
}

export default function PrismaChecklistAudit({
  checklist,
  onUpdateItem,
  onNavigateStage,
}: PrismaChecklistAuditProps) {
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const reportedCount = checklist.filter((c) => c.status === "Reported").length;
  const partialCount = checklist.filter((c) => c.status === "Partially reported").length;
  const notReportedCount = checklist.filter((c) => c.status === "Not reported").length;
  const totalRelevant = checklist.filter((c) => c.status !== "Not applicable").length;
  const compliancePct = Math.round((reportedCount / totalRelevant) * 100);

  const filteredItems = checklist.filter((item) => {
    if (sectionFilter !== "ALL" && item.section !== sectionFilter) return false;
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.itemNumber.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.checklistDescription.toLowerCase().includes(q) ||
        item.locationInReview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStageIndex = (mapping: string): number => {
    if (mapping.includes("Stage 01")) return 0;
    if (mapping.includes("Stage 02")) return 1;
    if (mapping.includes("Stage 03")) return 2;
    if (mapping.includes("Stage 04")) return 3;
    if (mapping.includes("Stage 05")) return 4;
    if (mapping.includes("Stage 06")) return 5;
    if (mapping.includes("Stage 07")) return 6;
    if (mapping.includes("Stage 08")) return 7;
    if (mapping.includes("Stage 09")) return 8;
    if (mapping.includes("Stage 10")) return 9;
    if (mapping.includes("Stage 11")) return 10;
    return 11;
  };

  const exportMarkdown = () => {
    let md = "# PRISMA 2020 Checklist Compliance Audit\n\n";
    md += `**Overall Compliance:** ${compliancePct}% (${reportedCount}/${totalRelevant} Items Reported)\n\n`;
    md += "| Section | Item # | Topic | PRISMA 2020 Checklist Item | Location in Manuscript | Status | Notes |\n";
    md += "| --- | --- | --- | --- | --- | --- | --- |\n";

    checklist.forEach((item) => {
      md += `| ${item.section} | ${item.itemNumber} | ${item.topic} | ${item.checklistDescription.replace(/\|/g, "/")} | ${item.locationInReview.replace(/\|/g, "/")} | ${item.status} | ${item.userNotes.replace(/\|/g, "/")} |\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRISMA_2020_Checklist_Report.md";
    a.click();
  };

  const exportCSV = () => {
    const headers = ["Section", "Item Number", "Topic", "Checklist Description", "Location in Manuscript", "Status", "User Notes"];
    const rows = checklist.map((i) => [
      `"${i.section}"`,
      `"${i.itemNumber}"`,
      `"${i.topic}"`,
      `"${i.checklistDescription.replace(/"/g, '""')}"`,
      `"${i.locationInReview.replace(/"/g, '""')}"`,
      `"${i.status}"`,
      `"${i.userNotes.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRISMA_2020_Checklist_Table.csv";
    a.click();
  };

  const copyChecklist = () => {
    let text = "PRISMA 2020 Checklist Audit Summary\n\n";
    checklist.forEach((c) => {
      text += `[Item ${c.itemNumber}] ${c.topic} (${c.section}): ${c.status}\n`;
      text += `Description: ${c.checklistDescription}\n`;
      text += `Location: ${c.locationInReview} | Notes: ${c.userNotes}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="prisma-checklist-audit-container" className="space-y-6">
      {/* Header Card with Compliance Stats */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 27-Item Statement Verification
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              PRISMA 2020 Checklist Compliance Audit
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Cross-reference all 27 standard PRISMA 2020 items across Methods (Items 5–15), Results (Items 16a–22), Discussion (Items 23a–23d), and Title/Intro sections.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={exportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Export Markdown
            </button>
            <button
              onClick={copyChecklist}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Summary"}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900">{compliancePct}% Compliance Score</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{reportedCount} Reported</span>
              {partialCount > 0 && <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{partialCount} Partial</span>}
              {notReportedCount > 0 && <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{notReportedCount} Missing</span>}
            </div>
            <span className="text-slate-500">{reportedCount} / {totalRelevant} items</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            <div style={{ width: `${(reportedCount / totalRelevant) * 100}%` }} className="bg-emerald-600 h-full transition-all" title="Reported" />
            <div style={{ width: `${(partialCount / totalRelevant) * 100}%` }} className="bg-amber-500 h-full transition-all" title="Partially reported" />
            <div style={{ width: `${(notReportedCount / totalRelevant) * 100}%` }} className="bg-rose-500 h-full transition-all" title="Not reported" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-indigo-600 mr-1" />
            <span className="text-xs font-mono font-semibold text-slate-700 mr-1">Section:</span>
            {["ALL", "METHODS", "RESULTS", "DISCUSSION", "INTRODUCTION", "TITLE", "ABSTRACT", "OTHER"].map((sec) => (
              <button
                key={sec}
                onClick={() => setSectionFilter(sec)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                  sectionFilter === sec
                    ? "bg-slate-900 text-white font-semibold shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                }`}
              >
                {sec === "METHODS" ? "Methods (5-15)" : sec === "RESULTS" ? "Results (16a-22)" : sec === "DISCUSSION" ? "Discussion (23a-d)" : sec}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-mono py-1 px-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Partially reported">Partially reported</option>
              <option value="Not reported">Not reported</option>
              <option value="Not applicable">Not applicable</option>
            </select>
          </div>
        </div>

        <div>
          <input
            type="text"
            placeholder="Search PRISMA items by number, keyword, or description (e.g. '13a', 'risk of bias', 'eligibility')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-mono text-[11px]">
                <th className="p-3.5 w-16 text-center">Item #</th>
                <th className="p-3.5 w-32">Section / Topic</th>
                <th className="p-3.5">PRISMA 2020 Checklist Description</th>
                <th className="p-3.5 w-44">Location in Review</th>
                <th className="p-3.5 w-36">Status</th>
                <th className="p-3.5 w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const stageIdx = getStageIndex(item.appStageMapping);
                return (
                  <tr
                    key={item.itemNumber}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      item.status === "Reported"
                        ? "bg-white"
                        : item.status === "Partially reported"
                        ? "bg-amber-50/20"
                        : "bg-rose-50/20"
                    }`}
                  >
                    {/* Item Number */}
                    <td className="p-3.5 text-center align-top font-mono font-bold text-indigo-600 text-sm">
                      {item.itemNumber}
                    </td>

                    {/* Section / Topic */}
                    <td className="p-3.5 align-top">
                      <div className="font-mono text-[10px] uppercase font-bold text-slate-400">
                        {item.section}
                      </div>
                      <div className="font-bold text-xs text-slate-900 mt-0.5">
                        {item.topic}
                      </div>
                    </td>

                    {/* Checklist Description & User Notes */}
                    <td className="p-3.5 align-top space-y-2">
                      <div className="text-xs text-slate-700 leading-relaxed font-sans">
                        {item.checklistDescription}
                      </div>
                      <div className="pt-1">
                        <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                          Audit notes / verification remarks:
                        </label>
                        <input
                          type="text"
                          value={item.userNotes}
                          onChange={(e) => onUpdateItem(item.itemNumber, { userNotes: e.target.value })}
                          placeholder="Add audit note..."
                          className="w-full text-xs font-mono p-1.5 border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                        />
                      </div>
                    </td>

                    {/* Location in Review */}
                    <td className="p-3.5 align-top">
                      <input
                        type="text"
                        value={item.locationInReview}
                        onChange={(e) => onUpdateItem(item.itemNumber, { locationInReview: e.target.value })}
                        placeholder="e.g. Section 2.1 / Table 1"
                        className="w-full text-xs font-mono p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                      />
                      <div className="text-[10px] font-mono text-indigo-600 mt-1 font-medium">
                        {item.appStageMapping}
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-3.5 align-top">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateItem(item.itemNumber, { status: e.target.value as any })}
                        className={`w-full text-xs font-mono font-semibold p-1.5 border rounded-lg ${
                          item.status === "Reported"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : item.status === "Partially reported"
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                      >
                        <option value="Reported">Reported</option>
                        <option value="Partially reported">Partially reported</option>
                        <option value="Not reported">Not reported</option>
                        <option value="Not applicable">Not applicable</option>
                      </select>
                    </td>

                    {/* Stage Navigation Button */}
                    <td className="p-3.5 align-top text-center">
                      <button
                        onClick={() => onNavigateStage?.(stageIdx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title={`Jump to ${item.appStageMapping}`}
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

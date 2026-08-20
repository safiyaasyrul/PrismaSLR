import React, { useRef, useState } from "react";
import { SLRRecord } from "../types/slr";
import { parseUpload, dedupeRecords, exportRecordsToCSV } from "../utils/parser";
import {
  UploadCloud,
  FileText,
  Trash2,
  Layers,
  Download,
  CheckCircle,
  Database,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Search,
  PlusCircle,
  Check,
  RotateCcw,
  X,
  BookOpen,
} from "lucide-react";

interface RecordsImportProps {
  records: SLRRecord[];
  onUpdateRecords: (records: SLRRecord[]) => void;
  dupesRemoved: number | null;
  onUpdateDupesRemoved: (count: number) => void;
  onLoadSample: () => void;
  onStartBlankReview?: () => void;
  onAutoSyncAllStagesFromRecords?: (customRecordsList?: SLRRecord[]) => void;
}

export default function RecordsImport({
  records,
  onUpdateRecords,
  dupesRemoved,
  onUpdateDupesRemoved,
  onLoadSample,
  onStartBlankReview,
  onAutoSyncAllStagesFromRecords,
}: RecordsImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFiles, setImportedFiles] = useState<{ name: string; count: number; db: string }[]>([]);
  const [selectedDb, setSelectedDb] = useState<"Scopus" | "Web of Science" | "PubMed" | "Google Scholar" | "IEEE Xplore" | "Cochrane" | "Other">("Scopus");
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check if current records contain the sample diabetes dataset
  const hasDiabetesSample = records.some(
    (r) =>
      r.id.startsWith("chen-2023") ||
      r.id.startsWith("rodriguez-2024") ||
      r.id.startsWith("zhao-2023") ||
      r.title.toLowerCase().includes("diabetes")
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    let allNew: SLRRecord[] = [];
    const newFilesInfo: { name: string; count: number; db: string }[] = [];

    for (const f of arr) {
      const text = await f.text();
      const parsed = parseUpload(f.name, text, selectedDb);
      newFilesInfo.push({ name: f.name, count: parsed.length, db: selectedDb });
      allNew = [...allNew, ...parsed];
    }

    if (allNew.length === 0) {
      alert("No valid records could be parsed from the selected file(s). Please verify the file is a valid .RIS, .BIB, or citation text export.");
      return;
    }

    if (importMode === "replace") {
      setImportedFiles(newFilesInfo);
      onUpdateRecords(allNew);
      onUpdateDupesRemoved(0);
      if (onAutoSyncAllStagesFromRecords) {
        onAutoSyncAllStagesFromRecords(allNew);
        showToast(`Imported ${allNew.length} record(s) and synchronized all PRISMA review tables & sections.`);
      } else {
        showToast(`Imported ${allNew.length} record(s). Replaced previous records.`);
      }
    } else {
      setImportedFiles((prev) => [...prev, ...newFilesInfo]);
      const combined = [...records, ...allNew];
      onUpdateRecords(combined);
      showToast(`Appended ${allNew.length} new record(s). Total library: ${combined.length}.`);
    }
  };

  const handleDeleteRecord = (id: string) => {
    onUpdateRecords(records.filter((r) => r.id !== id));
  };

  const removeFile = (name: string) => {
    setImportedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const runDeduplication = () => {
    const { kept, removed } = dedupeRecords(records);
    onUpdateRecords(kept);
    onUpdateDupesRemoved((dupesRemoved || 0) + removed);
    showToast(`Deduplication complete: ${removed} duplicate record(s) removed.`);
  };

  const clearAllRecordsOnly = () => {
    if (window.confirm("Are you sure you want to clear all imported records from your library?")) {
      onUpdateRecords([]);
      setImportedFiles([]);
      onUpdateDupesRemoved(0);
      showToast("Cleared all records from library.");
    }
  };

  // Database distribution calculation
  const dbCounts = records.reduce((acc, r) => {
    const db = r.databaseSource || "Other";
    acc[db] = (acc[db] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredRecords = searchQuery.trim()
    ? records.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.abstract && r.abstract.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.databaseSource && r.databaseSource.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : records;

  return (
    <div id="records-import-container" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between shadow-xs animate-fade-in font-mono text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notice if sample dataset is currently loaded */}
      {hasDiabetesSample && (
        <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-indigo-950">
                Sample Demonstration Dataset is currently active ({records.length} records)
              </strong>
              <span className="text-indigo-800">
                To run your systematic review on your custom topic, simply upload your <strong>.RIS</strong> or <strong>.BIB</strong> file below (with <em>"Replace Existing Records"</em> checked), or click <em>Clear Records</em> to start from scratch.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAllRecordsOnly}
              className="px-3 py-1.5 font-mono font-medium text-xs text-rose-700 bg-white hover:bg-rose-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Clear Demo Records
            </button>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 6 & 16a
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Import Bibliographic Records (.RIS, .BibTeX, .TXT)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload search export files from Scopus, Web of Science, PubMed, Google Scholar, IEEE, or Cochrane.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onStartBlankReview && (
              <button
                onClick={onStartBlankReview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Reset all stages for a completely blank new review"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Start Blank Review
              </button>
            )}

            <button
              onClick={onLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Load PRISMA Demo Dataset
            </button>

            {records.length > 0 && (
              <button
                onClick={clearAllRecordsOnly}
                className="px-3 py-1.5 text-xs font-mono text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear Records ({records.length})
              </button>
            )}
          </div>
        </div>

        {/* Import Mode Selector: Replace vs Append */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
              Upload Mode:
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {importMode === "replace"
                ? "Will replace any existing records upon upload"
                : "Will add to current records"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setImportMode("replace")}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                importMode === "replace"
                  ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-2xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    Replace Existing Records (Recommended for new review)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Clears previously loaded records (including sample diabetes data) and keeps only the new uploaded file(s).
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setImportMode("append")}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                importMode === "append"
                  ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-2xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "append"}
                  onChange={() => setImportMode("append")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Append to Existing Library (Multi-database search)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Merges newly uploaded citations into your current collection (e.g., adding Scopus, PubMed, and WoS exports together).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Origin Picker */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
          <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700">
            Assign Database Origin for Next Upload:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(["Scopus", "Web of Science", "PubMed", "Google Scholar", "IEEE Xplore", "Cochrane", "Other"] as const).map((db) => (
              <button
                key={db}
                onClick={() => setSelectedDb(db)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                  selectedDb === db
                    ? "bg-slate-900 text-white font-semibold shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {db}
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/40 p-8 text-center rounded-xl cursor-pointer transition-colors"
        >
          <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <div className="font-mono text-sm font-semibold text-slate-900">
            Drop .RIS, .BIB, or .TXT Export Files Here
          </div>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            or click to browse files on your computer. Assigning to <strong className="text-indigo-600">{selectedDb}</strong> with mode: <strong className="text-indigo-600">{importMode.toUpperCase()}</strong>.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ris,.bib,.bibtex,.txt"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Uploaded Files Chips */}
        {importedFiles.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-xs font-mono text-slate-500 font-semibold">Imported Files ({importedFiles.length}):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {importedFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-mono truncate text-slate-800">{f.name}</span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {f.db}: {f.count} recs
                    </span>
                  </div>
                  <button onClick={() => removeFile(f.name)} className="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Database Distribution & Deduplication Actions */}
      {records.length > 0 && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-lg">
                {records.length} Total Records in Library
              </span>
              {dupesRemoved !== null && dupesRemoved > 0 && (
                <span className="font-mono text-xs px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 font-semibold rounded-lg">
                  {dupesRemoved} Duplicates Excluded
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onAutoSyncAllStagesFromRecords && (
                <button
                  onClick={() => {
                    onAutoSyncAllStagesFromRecords();
                    showToast("Successfully synchronized all PRISMA stages with your uploaded records!");
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  title="Generate study characteristics, risk of bias, synthesis, GRADE, and discussion for your uploaded records"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Sync All Stages with Uploaded Records
                </button>
              )}
              <button
                onClick={runDeduplication}
                className="px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Run Title Deduplication (Item 16a)
              </button>
              <button
                onClick={() => {
                  const csv = exportRecordsToCSV(records);
                  const blob = new Blob([csv], { type: "text/csv" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "imported_records.csv";
                  a.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Database Breakdown Chips */}
          <div className="pt-2 border-t border-slate-100">
            <div className="font-mono text-xs text-slate-500 mb-2 font-semibold">
              Records Breakdown by Source Database (Item 6):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(dbCounts).map(([db, count]) => (
                <div key={db} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
                  <div className="font-mono text-[11px] text-slate-500">{db}</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">{count} records</div>
                </div>
              ))}
            </div>
          </div>

          {/* Search and Records Preview List */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-xs text-slate-500 font-semibold">
                Library Studies ({filteredRecords.length} of {records.length}):
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search title, author, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-sans pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredRecords.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 leading-snug">{r.title}</div>
                    <div className="text-xs text-slate-500 font-sans flex items-center gap-2 flex-wrap">
                      <span>{(r.authors || []).join(", ") || "Unknown authors"}</span>
                      <span>·</span>
                      <span>{r.year || "Year N/A"}</span>
                      <span>·</span>
                      <span>{r.source || "Journal"}</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {r.databaseSource || "Database"}
                      </span>
                    </div>
                    {r.abstract && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed font-sans">
                        {r.abstract}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteRecord(r.id)}
                    title="Remove this record from library"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {filteredRecords.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  No records matching "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

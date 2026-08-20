import React, { useRef, useState } from "react";
import { SLRRecord } from "../types/slr";
import { parseUpload, dedupeRecords, exportRecordsToCSV, exportRecordsToRIS } from "../utils/parser";
import { UploadCloud, FileText, Trash2, Layers, Download, CheckCircle, Database, Sparkles } from "lucide-react";

interface RecordsImportProps {
  records: SLRRecord[];
  onUpdateRecords: (records: SLRRecord[]) => void;
  dupesRemoved: number | null;
  onUpdateDupesRemoved: (count: number) => void;
  onLoadSample: () => void;
}

export default function RecordsImport({
  records,
  onUpdateRecords,
  dupesRemoved,
  onUpdateDupesRemoved,
  onLoadSample,
}: RecordsImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFiles, setImportedFiles] = useState<{ name: string; count: number; db: string }[]>([]);
  const [selectedDb, setSelectedDb] = useState<"Scopus" | "Web of Science" | "PubMed" | "Google Scholar" | "IEEE Xplore" | "Cochrane" | "Other">("Scopus");

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

    setImportedFiles((prev) => [...prev, ...newFilesInfo]);
    onUpdateRecords([...records, ...allNew]);
  };

  const removeFile = (name: string) => {
    setImportedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const runDeduplication = () => {
    const { kept, removed } = dedupeRecords(records);
    onUpdateRecords(kept);
    onUpdateDupesRemoved((dupesRemoved || 0) + removed);
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all imported records?")) {
      onUpdateRecords([]);
      setImportedFiles([]);
      onUpdateDupesRemoved(0);
    }
  };

  // Database distribution calculation
  const dbCounts = records.reduce((acc, r) => {
    const db = r.databaseSource || "Other";
    acc[db] = (acc[db] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div id="records-import-container" className="space-y-6">
      {/* Header card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
              PRISMA 2020 Items 6 & 16a
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Import Bibliographic Records (.RIS & .BibTeX)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload exported search result files from Scopus, Web of Science, PubMed, and Google Scholar. Deduplicate across sources.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Load PRISMA 2020 Example Dataset
            </button>
            {records.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs font-mono text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
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
            or click to browse files on your computer. Assigning to <strong className="text-indigo-600">{selectedDb}</strong>.
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
                {records.length} Total Records Loaded
              </span>
              {dupesRemoved !== null && (
                <span className="font-mono text-xs px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 font-semibold rounded-lg">
                  {dupesRemoved} Duplicates Excluded
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
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

          {/* Table Preview */}
          <div className="pt-2">
            <div className="font-mono text-xs text-slate-500 mb-2 font-semibold">
              Preview Loaded Records (First 5):
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {records.slice(0, 5).map((r) => (
                <div key={r.id} className="p-3.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50/60 transition-colors">
                  <div className="font-bold text-sm text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500 mt-1 font-sans">
                    {(r.authors || []).join(", ")} · {r.year} · {r.source || "Journal"}
                    <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {r.databaseSource || "Database"}
                    </span>
                  </div>
                  {r.abstract && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {r.abstract}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

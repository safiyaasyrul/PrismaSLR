import { SLRRecord } from "../types/slr";

export function parseRIS(text: string, defaultSource: "Scopus" | "Web of Science" | "PubMed" | "Google Scholar" | "IEEE Xplore" | "Cochrane" | "Other" = "Scopus"): SLRRecord[] {
  const records: SLRRecord[] = [];
  const blocks = text.split(/\r?\n(?=TY  - )/g).filter((b) => b.trim());
  blocks.forEach((block, idx) => {
    const lines = block.split(/\r?\n/);
    const rec: SLRRecord = {
      id: `ris-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      authors: [],
      title: "",
      year: "",
      abstract: "",
      source: "",
      databaseSource: defaultSource,
    };
    lines.forEach((line) => {
      const m = line.match(/^([A-Z0-9]{2})  - (.*)$/);
      if (!m) return;
      const [, tag, val] = m;
      if (tag === "TI" || tag === "T1") rec.title = rec.title || val.trim();
      else if (tag === "AU" || tag === "A1") rec.authors.push(val.trim());
      else if (tag === "PY" || tag === "Y1") rec.year = (val.match(/\d{4}/) || [""])[0];
      else if (tag === "AB" || tag === "N2") rec.abstract = rec.abstract || val.trim();
      else if (tag === "JO" || tag === "JF" || tag === "T2") rec.source = rec.source || val.trim();
      else if (tag === "DO") rec.doi = val.trim();
    });
    if (rec.title) records.push(rec);
  });
  return records;
}

export function parseBibTeX(text: string, defaultSource: "Scopus" | "Web of Science" | "PubMed" | "Google Scholar" | "IEEE Xplore" | "Cochrane" | "Other" = "Web of Science"): SLRRecord[] {
  const records: SLRRecord[] = [];
  const entries = text.split(/@\w+\{/g).slice(1);
  entries.forEach((entry, idx) => {
    const rec: SLRRecord = {
      id: `bib-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      authors: [],
      title: "",
      year: "",
      abstract: "",
      source: "",
      databaseSource: defaultSource,
    };
    const grab = (field: string) => {
      const m = entry.match(new RegExp(field + "\\s*=\\s*[{\"]([^}\"]*)[}\"]", "i"));
      return m ? m[1].replace(/\s+/g, " ").trim() : "";
    };
    rec.title = grab("title");
    rec.year = grab("year");
    rec.abstract = grab("abstract");
    rec.source = grab("journal") || grab("booktitle");
    rec.doi = grab("doi");
    const authorStr = grab("author");
    rec.authors = authorStr ? authorStr.split(/\s+and\s+/).map((a) => a.trim()) : [];
    if (rec.title) records.push(rec);
  });
  return records;
}

export function parseUpload(
  filename: string,
  text: string,
  detectedDb?: "Scopus" | "Web of Science" | "PubMed" | "Google Scholar" | "IEEE Xplore" | "Cochrane" | "Other"
): SLRRecord[] {
  let db = detectedDb;
  if (!db) {
    const lower = filename.toLowerCase();
    if (lower.includes("scopus")) db = "Scopus";
    else if (lower.includes("wos") || lower.includes("web_of_science") || lower.includes("savedrecs")) db = "Web of Science";
    else if (lower.includes("pubmed") || lower.includes("medline")) db = "PubMed";
    else if (lower.includes("scholar") || lower.includes("citations")) db = "Google Scholar";
    else if (lower.includes("ieee")) db = "IEEE Xplore";
    else if (lower.includes("cochrane")) db = "Cochrane";
    else db = "Scopus";
  }

  if (/\.bib$/i.test(filename) || text.trim().startsWith("@")) {
    return parseBibTeX(text, db);
  }
  return parseRIS(text, db);
}

export function normalizeTitle(t: string): string {
  return (t || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeRecords(records: SLRRecord[]): { kept: SLRRecord[]; removed: number } {
  const groups = new Map<string, SLRRecord[]>();
  records.forEach((r) => {
    const key = normalizeTitle(r.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });
  const kept: SLRRecord[] = [];
  let removed = 0;
  groups.forEach((group) => {
    if (group.length === 1) {
      kept.push(group[0]);
    } else {
      removed += group.length - 1;
      // Keep record with longest abstract
      const best = group.reduce((a, b) => ((b.abstract || "").length > (a.abstract || "").length ? b : a));
      kept.push(best);
    }
  });
  return { kept, removed };
}

export function exportRecordsToCSV(records: SLRRecord[]): string {
  const headers = ["ID", "Title", "Authors", "Year", "Journal / Source", "Database", "DOI", "Abstract"];
  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${(r.title || "").replace(/"/g, '""')}"`,
    `"${(r.authors || []).join("; ").replace(/"/g, '""')}"`,
    `"${r.year || ""}"`,
    `"${(r.source || "").replace(/"/g, '""')}"`,
    `"${r.databaseSource || ""}"`,
    `"${r.doi || ""}"`,
    `"${(r.abstract || "").replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportRecordsToRIS(records: SLRRecord[]): string {
  return records
    .map((r) => {
      let ris = "TY  - JOUR\n";
      ris += `TI  - ${r.title}\n`;
      (r.authors || []).forEach((a) => {
        ris += `AU  - ${a}\n`;
      });
      if (r.year) ris += `PY  - ${r.year}\n`;
      if (r.source) ris += `JO  - ${r.source}\n`;
      if (r.abstract) ris += `AB  - ${r.abstract}\n`;
      if (r.doi) ris += `DO  - ${r.doi}\n`;
      ris += "ER  - \n";
      return ris;
    })
    .join("\n");
}

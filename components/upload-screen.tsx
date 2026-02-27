"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, FileSpreadsheet, X, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import type { SheetData } from "@/lib/data-helpers";
import { processWorkbook } from "@/lib/excel-processor";

interface UploadScreenProps {
  onDataLoaded: (data: SheetData) => void;
  onLogout: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  period?: string;
}

export function UploadScreen({ onDataLoaded, onLogout }: UploadScreenProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (msg: string, error = false) => {
    setStatus(msg);
    setIsError(error);
  };

  const handleFilesAdded = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles: UploadFile[] = [];
    Array.from(newFiles).forEach(f => {
      if (/\.xlsx?$/i.test(f.name)) {
        validFiles.push({ file: f, id: Math.random().toString(36).substring(7), status: "pending" });
      }
    });
    if (validFiles.length === 0) { showStatus("Please select .xlsx or .xls files", true); return; }
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const uploadAll = async () => {
    if (files.length === 0) return;
    setLoading(true);
    showStatus("Uploading files...");
    let lastData: SheetData | null = null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status === "success") continue;
      setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: "uploading" } : item));
      try {
        const formData = new FormData();
        formData.append("file", f.file);
        const uploadRes = await fetch("/api/excel", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        const arrayBuffer = await f.file.arrayBuffer();
        const sheets = processWorkbook(arrayBuffer);
        lastData = sheets;
        setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: "success", period: uploadData.period } : item));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: "error", error: msg } : item));
      }
    }
    setLoading(false);
    if (lastData) { showStatus("All files processed!"); setTimeout(() => onDataLoaded(lastData!), 800); }
    else showStatus("Some uploads failed.", true);
  };

  const loadFromS3 = useCallback(async () => {
    setLoading(true);
    showStatus("Connecting to data storage...");
    try {
      const res = await fetch("/api/excel");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load data");
      showStatus("Processing data...");
      const binaryStr = atob(result.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const sheets = processWorkbook(bytes.buffer);
      onDataLoaded(sheets);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showStatus("Failed: " + msg, true);
      setLoading(false);
    }
  }, [onDataLoaded]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto py-10">
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-[var(--surface)] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Logout
        </button>
        <ThemeToggle />
      </div>

      <div className="w-[480px] max-w-[90vw] flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl overflow-hidden bg-white border border-border shadow-md">
            <Image src="/iav_logo.jpeg" alt="Indian Art Villa" width={112} height={112} className="object-contain" />
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground">Indian Art Villa</p>
          <p className="text-xs text-muted-foreground">Financial Dashboard</p>
        </div>

        {/* Load from S3 */}
        <div className="w-full rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-4 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--primary)]">
            <Database className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground mb-1">Access the Data</p>
            <p className="text-xs text-muted-foreground">Load the latest financial data directly from secure storage</p>
          </div>
          <Button
            className="w-full bg-gradient-to-br from-[var(--gold)] to-[var(--primary)] text-primary-foreground font-semibold h-11 text-sm"
            onClick={loadFromS3}
            disabled={loading}
          >
            {loading && files.length === 0
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
              : <><Database className="h-4 w-4 mr-2" />Access the Data</>}
          </Button>
        </div>

        {/* Status message */}
        {status && (
          <p className={`text-sm text-center ${isError ? "text-red-400" : "text-muted-foreground"}`}>{status}</p>
        )}

        {/* Upload Section */}
        <div className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload New Files</span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${dragOver ? "border-[var(--gold)] bg-[var(--gold-dim)]" : "border-border hover:border-muted-foreground/40"}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFilesAdded(e.dataTransfer.files); }}
            >
              <div className="flex justify-center mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--gold-dim)]">
                  <FileSpreadsheet className="h-6 w-6 text-[var(--gold)]" />
                </div>
              </div>
              <p className="text-sm font-semibold mb-1">Upload Excel Files</p>
              <p className="text-xs text-muted-foreground mb-4">Drag &amp; drop or browse .xlsx / .xls files</p>
              <Button
                size="sm"
                className="bg-gradient-to-br from-[var(--gold)] to-[var(--primary)] text-primary-foreground font-semibold"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Browse Files
              </Button>
              <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={e => handleFilesAdded(e.target.files)} />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selected ({files.length})</span>
                  <Button size="sm" className="h-7 px-3 text-xs bg-[var(--gold)] hover:opacity-90" disabled={loading} onClick={uploadAll}>
                    {loading
                      ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Uploading</>
                      : <><Upload className="h-3 w-3 mr-1.5" />Upload All</>}
                  </Button>
                </div>
                <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-0.5">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        f.status === "success" ? "bg-green-500/10 text-green-500" :
                        f.status === "error"   ? "bg-red-500/10 text-red-500"   :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {f.status === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                         f.status === "success"   ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         f.status === "error"     ? <AlertCircle className="h-3.5 w-3.5" /> :
                         <FileSpreadsheet className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{f.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(f.file.size / 1024).toFixed(0)} KB &bull; {f.status}
                          {f.period && <span className="ml-2 text-[var(--gold)] font-bold">({f.period})</span>}
                        </p>
                      </div>
                      {f.status !== "uploading" && (
                        <button onClick={() => removeFile(f.id)} className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


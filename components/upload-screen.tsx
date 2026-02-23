"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Download, Loader2, FileSpreadsheet, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import type { SheetData } from "@/lib/data-helpers";
import { processWorkbook } from "@/lib/excel-processor";

interface UploadScreenProps {
  onDataLoaded: (data: SheetData) => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  period?: string;
}

export function UploadScreen({ onDataLoaded }: UploadScreenProps) {
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
        validFiles.push({
          file: f,
          id: Math.random().toString(36).substring(7),
          status: "pending"
        });
      }
    });

    if (validFiles.length === 0) {
      showStatus("Please select .xlsx or .xls files", true);
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadAll = async () => {
    if (files.length === 0) return;
    setLoading(true);
    showStatus("Uploading files...");

    let lastData: SheetData | null = null;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status === "success") continue;

      setFiles(prev => prev.map(item =>
        item.id === f.id ? { ...item, status: "uploading" } : item
      ));

      try {
        const formData = new FormData();
        formData.append("file", f.file);

        const uploadRes = await fetch("/api/excel", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

        // Parse locally 
        const arrayBuffer = await f.file.arrayBuffer();
        const sheets = processWorkbook(arrayBuffer);
        lastData = sheets;

        setFiles(prev => prev.map(item =>
          item.id === f.id ? {
            ...item,
            status: "success",
            period: uploadData.period
          } : item
        ));
      } catch (err: any) {
        setFiles(prev => prev.map(item =>
          item.id === f.id ? {
            ...item,
            status: "error",
            error: err.message
          } : item
        ));
      }
    }

    setLoading(false);

    // If we have data, load it (last one in the loop or latest detected period)
    if (lastData) {
      showStatus("All files processed!");
      setTimeout(() => onDataLoaded(lastData!), 800);
    } else {
      showStatus("Some uploads failed.", true);
    }
  };

  const loadFromS3 = useCallback(async () => {
    setLoading(true);
    showStatus("Connecting to Linode Object Storage...");

    try {
      const res = await fetch("/api/excel");
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to load from Linode");

      showStatus("Processing Excel data...");

      const binaryStr = atob(result.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const sheets = processWorkbook(bytes.buffer);
      onDataLoaded(sheets);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showStatus("S3 failed: " + msg, true);
      setLoading(false);
    }
  }, [onDataLoaded]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background overflow-y-auto py-10">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* IAV Logo header */}
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="flex h-36 w-36 items-center justify-center rounded-3xl overflow-hidden bg-white border border-border shadow-md">
          <Image src="/iav_logo.jpeg" alt="Indian Art Villa" width={144} height={144} className="object-contain" />
        </div>
        <p className="text-lg font-bold tracking-tight text-foreground">Indian Art Villa</p>
        <p className="text-xs text-muted-foreground">Financial Dashboard</p>
      </div>

      <div
        className={`w-[460px] max-w-[90vw] rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${dragOver
            ? "border-[var(--gold)] bg-[var(--gold-dim)]"
            : "border-[var(--border)] bg-card"
          }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFilesAdded(e.dataTransfer.files);
        }}
      >
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold-dim)]">
            <FileSpreadsheet className="h-8 w-8 text-[var(--gold)]" />
          </div>
        </div>
        <p className="text-base font-semibold mb-1.5">Upload Excel Files</p>
        <p className="text-sm text-muted-foreground mb-5">
          Select one or more month-wise files
        </p>
        <Button
          className="bg-gradient-to-br from-[var(--gold)] to-[var(--primary)] text-primary-foreground font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <Upload className="h-4 w-4" />
          Browse Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFilesAdded(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="w-[460px] max-w-[90vw] space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Selected Files ({files.length})
            </span>
            <Button
              size="sm"
              className="h-8 px-4 text-xs bg-[var(--gold)] hover:opacity-90"
              disabled={loading}
              onClick={uploadAll}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
              Upload All
            </Button>
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${f.status === 'success' ? 'bg-green-500/10 text-green-500' :
                    f.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
                  }`}>
                  {f.status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    f.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                      f.status === 'error' ? <AlertCircle className="h-4 w-4" /> :
                        <FileSpreadsheet className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{f.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(f.file.size / 1024).toFixed(0)} KB • {f.status}
                    {f.period && <span className="ml-2 text-[var(--gold)] font-bold">({f.period})</span>}
                  </p>
                </div>
                {f.status !== "uploading" && (
                  <button
                    onClick={() => removeFile(f.id)}
                    className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 w-[460px] max-w-[90vw] text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="border-[var(--border)]"
        onClick={loadFromS3}
        disabled={loading}
      >
        <Download className="h-4 w-4" />
        Load from Linode S3
      </Button>

      {status && (
        <p className={`text-sm min-h-[20px] text-center ${isError ? "text-[var(--red)]" : "text-muted-foreground"}`}>
          {status}
        </p>
      )}
    </div>
  );
}

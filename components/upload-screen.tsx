"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SheetData } from "@/lib/data-helpers";
import { processWorkbook } from "@/lib/excel-processor";

interface UploadScreenProps {
  onDataLoaded: (data: SheetData) => void;
}

export function UploadScreen({ onDataLoaded }: UploadScreenProps) {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (msg: string, error = false) => {
    setStatus(msg);
    setIsError(error);
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!/\.xlsx?$/i.test(file.name)) {
        showStatus("Please select an .xlsx or .xls file", true);
        return;
      }

      setLoading(true);
      showStatus("Uploading " + file.name + " to Linode S3...");

      try {
        // Upload to Linode S3
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/excel", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Upload failed");
        }

        showStatus("Processing Excel data...");

        // Parse locally
        const arrayBuffer = await file.arrayBuffer();
        const sheets = processWorkbook(arrayBuffer);
        onDataLoaded(sheets);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        showStatus("Error: " + msg, true);
        setLoading(false);
      }
    },
    [onDataLoaded]
  );

  const loadFromS3 = useCallback(async () => {
    setLoading(true);
    showStatus("Connecting to Linode Object Storage...");

    try {
      const res = await fetch("/api/excel");
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to load from Linode");
      }

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
      showStatus(
        "S3 failed: " + msg + " \u2014 Try uploading the file instead.",
        true
      );
      setLoading(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background">
      <div
        className={`w-[460px] max-w-[90vw] rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-[var(--gold)] bg-[var(--gold-dim)]"
            : "border-[var(--border)] bg-card"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold-dim)]">
            <FileSpreadsheet className="h-8 w-8 text-[var(--gold)]" />
          </div>
        </div>
        <p className="text-base font-semibold text-foreground mb-1.5">
          Upload Excel File
        </p>
        <p className="text-sm text-muted-foreground mb-5">
          {"Drag & drop your "}
          <strong className="text-foreground">data.xlsx</strong>
          {" file here"}
        </p>
        <Button
          className="bg-gradient-to-br from-[var(--gold)] to-[#e8c960] text-[#0b0d11] font-semibold hover:opacity-85"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <Upload className="h-4 w-4" />
          Browse File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      <div className="flex items-center gap-3 w-[460px] max-w-[90vw] text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="border-[var(--border)] text-[var(--text2)] hover:text-foreground hover:border-[var(--gold)] hover:bg-[var(--surface2)]"
        onClick={loadFromS3}
        disabled={loading}
      >
        <Download className="h-4 w-4" />
        Load from Linode S3
      </Button>

      {loading && (
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
      )}

      {status && (
        <p
          className={`text-sm min-h-[20px] text-center ${isError ? "text-[var(--red)]" : "text-muted-foreground"}`}
        >
          {status}
        </p>
      )}
    </div>
  );
}

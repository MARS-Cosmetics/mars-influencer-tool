"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Upload, FileSpreadsheet, FileText, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";

type ImportSummary = {
  totalRowsInFile: number;
  created: number;
  skippedDuplicates: number;
  errorRows: number;
};

type RowError = {
  row: number;
  field: string;
  value: string;
  message: string;
};

type SkippedDup = {
  row: number;
  instagramHandle: string;
};

type ImportResult = {
  summary: ImportSummary;
  errors: RowError[];
  skippedDuplicates: SkippedDup[];
};

export function BulkImportDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // refresh the list when the user closes the dialog after a successful import
      if (result?.summary.created && result.summary.created > 0) {
        router.refresh();
      }
      reset();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Pick a file first");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/influencers/bulk-import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Import failed");
        setResult(json.partial ?? null);
        return;
      }
      setResult(json as ImportResult);
      const { created, skippedDuplicates, errorRows } = (json as ImportResult).summary;
      if (errorRows === 0 && skippedDuplicates === 0) {
        toast.success(`Imported ${created} influencer${created === 1 ? "" : "s"}`);
      } else {
        toast.message(`Imported ${created} • Skipped ${skippedDuplicates} • Failed ${errorRows}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Bulk Import
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import influencers</DialogTitle>
          <DialogDescription>
            Download a template, fill it in offline, then upload. Required columns are marked with{" "}
            <span className="font-mono">*</span>. Rows with errors are skipped — the rest still import.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            {/* Step 1: download */}
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium mb-2">1. Download a template</p>
              <p className="text-xs text-muted-foreground mb-3">
                The Excel version includes an Instructions sheet with allowed values for each column.
              </p>
              <div className="flex gap-2">
                <a
                  href="/api/influencers/template?format=xlsx"
                  download
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <FileSpreadsheet className="size-4" />
                  Excel template (.xlsx)
                </a>
                <a
                  href="/api/influencers/template?format=csv"
                  download
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <FileText className="size-4" />
                  CSV template (.csv)
                </a>
              </div>
            </div>

            {/* Step 2: upload */}
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium mb-2">2. Upload your filled file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:opacity-90"
              />
              {file && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <div>
                Maximum 1,000 rows per file. Existing Instagram handles are skipped automatically.
                Only the <span className="font-medium">name</span> column is required.
              </div>
            </div>
          </div>
        )}

        {result && (
          <ImportResultView result={result} onReset={reset} />
        )}

        <DialogFooter>
          {!result && (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!file || submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Importing…" : "Import"}
              </Button>
            </>
          )}
          {result && (
            <>
              <Button variant="ghost" onClick={reset}>
                Import another file
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportResultView({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  const { summary, errors, skippedDuplicates } = result;
  const fullSuccess = summary.errorRows === 0 && summary.skippedDuplicates === 0;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Top summary */}
      <div className={`rounded-lg border p-4 ${fullSuccess ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-2">
          {fullSuccess ? (
            <CheckCircle2 className="size-5 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-medium">
              {fullSuccess
                ? `All ${summary.created} influencers imported successfully.`
                : `Partial import.`}
            </p>
            {!fullSuccess && (
              <p className="text-muted-foreground mt-1">
                Created: <span className="font-medium text-foreground">{summary.created}</span>
                {" • "}
                Duplicates skipped: <span className="font-medium text-foreground">{summary.skippedDuplicates}</span>
                {" • "}
                Errors: <span className="font-medium text-foreground">{summary.errorRows}</span>
                {" "}out of {summary.totalRowsInFile} total rows
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Rows with errors ({errors.length}):</p>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 w-16">Row</th>
                  <th className="text-left p-2 w-40">Field</th>
                  <th className="text-left p-2">Issue</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 50).map((e, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono text-muted-foreground">{e.row}</td>
                    <td className="p-2 font-mono">{e.field}</td>
                    <td className="p-2">
                      {e.message}
                      {e.value && (
                        <span className="text-muted-foreground"> — got <code className="bg-muted px-1 rounded">{e.value}</code></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.length > 50 && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing first 50 of {errors.length} errors. Fix these in your file and re-upload.
            </p>
          )}
        </div>
      )}

      {/* Skipped duplicates */}
      {skippedDuplicates.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Skipped (duplicate Instagram handles):</p>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 w-16">Row</th>
                  <th className="text-left p-2">Handle (already in DB)</th>
                </tr>
              </thead>
              <tbody>
                {skippedDuplicates.slice(0, 50).map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono text-muted-foreground">{d.row}</td>
                    <td className="p-2 font-mono">@{d.instagramHandle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.created > 0 && (
        <p className="text-xs text-muted-foreground">
          New influencers will appear in the list after you close this dialog.
        </p>
      )}
      {/* keep onReset referenced for the Import another file button */}
      <input type="hidden" data-reset={String(typeof onReset)} />
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  label: string;
  required?: boolean;
  accept?: string; // e.g., ".pdf,.jpg,.png"
  maxSizeMB?: number;
  folder?: string; // upload category/folder
  value?: string; // existing file URL
  onChange: (url: string | null, fileName: string | null) => void;
  error?: string;
}

export function FileUpload({
  label,
  required = false,
  accept = ".pdf,.jpg,.jpeg,.png,.webp",
  maxSizeMB = 5,
  folder = "documents",
  value,
  onChange,
  error,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum ${maxSizeMB}MB allowed.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setFileName(file.name);
      onChange(data.url, file.name);
      toast.success(`${file.name} uploaded successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    setFileName(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasFile = value || fileName;
  const isPdf = value?.endsWith(".pdf") || fileName?.endsWith(".pdf");

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {hasFile ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          {isPdf ? (
            <FileText className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <Image className="h-5 w-5 text-green-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">
              {fileName || value?.split("/").pop()}
            </p>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Uploaded
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-full p-1 text-green-600 hover:bg-green-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-[#A6192E] bg-[#A6192E]/5"
              : error
              ? "border-red-300 bg-red-50"
              : "border-gray-300 hover:border-gray-400 bg-white"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#A6192E]" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG up to {maxSizeMB}MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !hasFile && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

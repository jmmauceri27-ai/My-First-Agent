"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";

export interface FileItem {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "📊";
  if (ext === "doc" || ext === "docx") return "📝";
  return "📎";
}

export default function FilesCard({
  title = "Files",
  description,
  files,
  onUpload,
  onDownload,
  onDelete,
  onRename,
  onChange,
}: {
  title?: string;
  description?: string;
  files: FileItem[];
  onUpload: (file: File) => Promise<{ error?: string }>;
  onDownload: (id: string) => Promise<{ url?: string; error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  onRename?: (id: string, fileName: string) => Promise<{ error?: string }>;
  onChange?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await onUpload(file);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(id: string) {
    setPendingDownloadId(id);
    setError(null);
    try {
      const result = await onDownload(id);
      if (result.error || !result.url) {
        setError(result.error ?? "Failed to open file.");
        return;
      }
      window.open(result.url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open file.");
    } finally {
      setPendingDownloadId(null);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    setError(null);
    try {
      const result = await onDelete(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete file.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  function startRename(f: FileItem) {
    setEditingId(f.id);
    setEditingName(f.fileName);
  }

  async function handleRename() {
    if (!editingId || !onRename) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("Please enter a file name.");
      return;
    }
    setError(null);
    setRenaming(true);
    try {
      const result = await onRename(editingId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename file.");
    } finally {
      setRenaming(false);
    }
  }

  return (
    <Card className="flex flex-col p-5">
      <h2 className="text-lg font-bold text-slate-50">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}

      <div className="mt-4 flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-400"
        />
        <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="w-fit">
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {error && <p className="text-xs text-critical">{error}</p>}
      </div>

      <div className="mt-4 flex flex-col divide-y divide-purple-400/10">
        {files.length === 0 ? (
          <p className="py-2 text-xs text-slate-400">No files attached yet.</p>
        ) : (
          files.map((f) =>
            editingId === f.id ? (
              <div key={f.id} className="flex items-center gap-2 py-2">
                <span className="text-lg leading-none">{fileIcon(f.fileName)}</span>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className={`${inputClass} py-1`}
                  autoFocus
                />
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={handleRename}
                    disabled={renaming}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-400 hover:bg-brand-500/10"
                  >
                    {renaming ? "…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={renaming}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-purple-500/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={f.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="text-lg leading-none">{fileIcon(f.fileName)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">{f.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {formatSize(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {onRename && (
                    <button
                      onClick={() => startRename(f)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-purple-500/10"
                    >
                      Rename
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(f.id)}
                    disabled={pendingDownloadId === f.id}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-400 hover:bg-brand-500/10"
                  >
                    {pendingDownloadId === f.id ? "…" : "Download"}
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={pendingDeleteId === f.id}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-critical hover:bg-critical/10"
                  >
                    {pendingDeleteId === f.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </Card>
  );
}

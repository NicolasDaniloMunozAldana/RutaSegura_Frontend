"use client";

import { useId, useRef, useState } from "react";
import { StorageFolder } from "@/lib/api/types/files";
import { DEFAULT_MAX_SIZE_MB, uploadToR2, validateFile } from "@/lib/upload";
import SecureFileLink from "@/components/SecureFileLink";

interface FileUploadProps {
  folder: StorageFolder;
  token: string | null;
  // Key actual del objeto (si ya hay un archivo guardado).
  value: string | null;
  onChange: (key: string | null) => void;
  label?: string;
  helpText?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

// Carga genérica con arrastrar-y-soltar: presigned PUT a R2 + barra de progreso.
export default function FileUpload({
  folder,
  token,
  value,
  onChange,
  label,
  helpText = "Arrastra un archivo o haz clic. PDF, JPG o PNG (máx. 8 MB).",
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    const validationError = validateFile(file, maxSizeMb);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!token) {
      setError("Tu sesión no es válida. Vuelve a iniciar sesión.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setFileName(file.name);
    try {
      const key = await uploadToR2({
        file,
        folder,
        token,
        maxSizeMb,
        onProgress: setProgress,
      });
      onChange(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo");
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    // Permite volver a seleccionar el mismo archivo.
    event.target.value = "";
  };

  const clear = () => {
    setFileName("");
    setError("");
    setProgress(0);
    onChange(null);
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}

      {value && !uploading ? (
        <div className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-emerald-600">
              check_circle
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {fileName || "Archivo cargado"}
              </p>
              <SecureFileLink fileKey={value} token={token} label="Ver archivo" />
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={clear}
              className="text-slate-400 hover:text-red-500 shrink-0"
              aria-label="Quitar archivo"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg px-3 py-5 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#0F2B4B] bg-[#0F2B4B]/5"
              : "border-slate-300 bg-white hover:border-[#0F2B4B]/50"
          } ${disabled || uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <span className="material-symbols-outlined text-slate-400">
            {uploading ? "cloud_sync" : "cloud_upload"}
          </span>
          {uploading ? (
            <div className="w-full max-w-xs">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F2B4B] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Subiendo… {progress}%</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">{helpText}</p>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onSelect}
            disabled={disabled || uploading}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

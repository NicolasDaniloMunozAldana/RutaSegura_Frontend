"use client";

import { useState } from "react";
import { filesAPI } from "@/lib/api";

interface SecureFileLinkProps {
  fileKey: string | null | undefined;
  token: string | null;
  label?: string;
  className?: string;
}

// Abre un archivo privado de R2 generando una URL prefirmada al momento del clic.
export default function SecureFileLink({
  fileKey,
  token,
  label = "Ver archivo",
  className,
}: SecureFileLinkProps) {
  const [loading, setLoading] = useState(false);

  if (!fileKey) {
    return <span className="text-xs text-slate-400">Sin archivo</span>;
  }

  const open = async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const res = await filesAPI.presignDownload(fileKey, token);
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch {
      // Si falla, no abrimos nada; el botón vuelve a estar disponible.
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-1 text-sm font-semibold text-[#0F2B4B] hover:underline disabled:opacity-60"
      }
    >
      <span className="material-symbols-outlined text-[18px]">
        {loading ? "hourglass_empty" : "open_in_new"}
      </span>
      {loading ? "Abriendo…" : label}
    </button>
  );
}

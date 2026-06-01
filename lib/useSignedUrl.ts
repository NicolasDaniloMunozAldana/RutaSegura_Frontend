"use client";

import { useEffect, useState } from "react";
import { filesAPI } from "@/lib/api";

// Obtiene una URL prefirmada (GET) para un objeto privado de R2.
// Útil para previsualizar imágenes (<img src>) de forma segura.
export function useSignedUrl(fileKey: string | null | undefined, token: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setError(false);

    if (!fileKey || !token) return;

    filesAPI
      .presignDownload(fileKey, token)
      .then((res) => {
        if (active) setUrl(res.data.url);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [fileKey, token]);

  return { url, error };
}

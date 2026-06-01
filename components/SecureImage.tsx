"use client";

import { useSignedUrl } from "@/lib/useSignedUrl";

interface SecureImageProps {
  fileKey: string | null | undefined;
  token: string | null;
  alt: string;
  className?: string;
}

// Muestra una imagen privada de R2 resolviendo una URL prefirmada al vuelo.
export default function SecureImage({
  fileKey,
  token,
  alt,
  className,
}: SecureImageProps) {
  const { url, error } = useSignedUrl(fileKey, token);
  const boxClass =
    className ??
    "w-full h-48 rounded-xl border border-slate-200 object-cover bg-white";

  if (!fileKey) {
    return (
      <div className="w-full h-48 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center px-4 text-center text-xs font-medium text-slate-500">
        Sin imagen cargada.
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-48 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center px-4 text-center text-xs font-medium text-slate-500">
        No se pudo cargar la imagen.
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-48 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
        Cargando imagen…
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={boxClass} />;
}

import { filesAPI } from "@/lib/api";
import { StorageFolder } from "@/lib/api/types/files";

// Tipos permitidos (deben coincidir con la validación del backend en R2).
export const ALLOWED_UPLOAD_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const DEFAULT_MAX_SIZE_MB = 8;

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Algunos navegadores entregan File.type vacío; inferimos por la extensión.
export function resolveContentType(file: File): string {
  if (file.type && ALLOWED_UPLOAD_MIME.includes(file.type as never)) {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_MIME[ext] ?? file.type ?? "";
}

export function validateFile(
  file: File,
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
): string | null {
  const contentType = resolveContentType(file);
  if (!ALLOWED_UPLOAD_MIME.includes(contentType as never)) {
    return "Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG o WEBP.";
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `El archivo supera el tamaño máximo de ${maxSizeMb} MB.`;
  }
  return null;
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`No se pudo subir el archivo (código ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo"));
    xhr.ontimeout = () => reject(new Error("La carga del archivo tardó demasiado"));
    xhr.send(file);
  });
}

/**
 * Flujo completo de carga a R2:
 * 1) pide al backend una URL prefirmada (PUT),
 * 2) sube el archivo directamente a R2 con progreso,
 * 3) devuelve la "key" del objeto para guardarla en la BD.
 * Reintenta una vez ante errores de red.
 */
export async function uploadToR2(params: {
  file: File;
  folder: StorageFolder;
  token: string;
  onProgress?: (percent: number) => void;
  maxSizeMb?: number;
}): Promise<string> {
  const { file, folder, token, onProgress, maxSizeMb } = params;

  const validationError = validateFile(file, maxSizeMb);
  if (validationError) throw new Error(validationError);

  const contentType = resolveContentType(file);
  const presign = await filesAPI.presignUpload(
    { folder, filename: file.name, contentType },
    token,
  );
  const { key, uploadUrl } = presign.data;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await putWithProgress(uploadUrl, file, contentType, onProgress);
      return key;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo subir el archivo");
}

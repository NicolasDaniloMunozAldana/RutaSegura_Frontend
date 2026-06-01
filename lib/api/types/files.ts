export type StorageFolder =
  | "vehicle-documents"
  | "driver-license"
  | "checklist";

export interface PresignUploadResponse {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface PresignDownloadResponse {
  url: string;
  expiresIn: number;
}

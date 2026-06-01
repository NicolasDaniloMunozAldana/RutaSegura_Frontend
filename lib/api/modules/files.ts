import { apiCall, ApiEnvelope } from "../core/client";
import {
  PresignDownloadResponse,
  PresignUploadResponse,
  StorageFolder,
} from "../types/files";

export const filesAPI = {
  presignUpload: (
    payload: { folder: StorageFolder; filename: string; contentType: string },
    token: string,
  ): Promise<ApiEnvelope<PresignUploadResponse>> =>
    apiCall("/files/presign-upload", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),

  presignDownload: (
    key: string,
    token: string,
  ): Promise<ApiEnvelope<PresignDownloadResponse>> =>
    apiCall(`/files/presign-download?key=${encodeURIComponent(key)}`, {
      token,
    }),
};

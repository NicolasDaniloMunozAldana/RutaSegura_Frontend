"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import FileUpload from "@/components/FileUpload";
import SecureImage from "@/components/SecureImage";
import { driverProfileAPI } from "@/lib/api";
import type { DriverRecord } from "@/lib/api";
import { DRIVER_ROLES } from "@/lib/roles";
import { showErrorDialog, showSuccessDialog } from "@/lib/dialogs";

const LICENSE_ROLE = "DRIVER_LICENSE";

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

// El vencimiento es 3 años después de la expedición (servicio público).
function addThreeYears(issueDate: string): string {
  const value = issueDate.trim();
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(Date.UTC(y + 3, m - 1, d));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function MiLicenciaContent() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [number, setNumber] = useState("");
  const [issue, setIssue] = useState("");
  const [fileKey, setFileKey] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await driverProfileAPI.getMyProfile(token);
      const license = (res.data as DriverRecord).personDocumentLinks.find(
        (link) => link.documentRole === LICENSE_ROLE,
      )?.personDocument;
      setNumber(license?.documentNumber ?? "");
      setIssue(toDateInput(license?.issueDate));
      setFileKey(license?.fileUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar tu licencia");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    if (!number.trim()) {
      showErrorDialog("Debes indicar el número de tu licencia.");
      return;
    }
    setSaving(true);
    try {
      await driverProfileAPI.upsertMyLicense(
        {
          documentNumber: number.trim(),
          issueDate: issue.trim() || undefined,
          fileKey: fileKey.trim() || undefined,
        },
        token,
      );
      showSuccessDialog("Tu licencia se guardó correctamente.");
      await load();
    } catch (err) {
      showErrorDialog(
        err instanceof Error ? err.message : "No se pudo guardar tu licencia",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2B4B]">Mi Licencia</h1>
        <p className="text-slate-500 text-sm mt-1">
          Mantén actualizada tu licencia de conducción y su foto.
        </p>
      </div>

      {loading && <div className="text-slate-500 text-sm">Cargando…</div>}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Número de licencia
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Fecha de expedición
              </label>
              <input
                type="date"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
              />
            </div>
          </div>

          {issue && (
            <p className="text-xs text-slate-500 -mt-2">
              Vence el{" "}
              <span className="font-semibold text-slate-700">
                {addThreeYears(issue)}
              </span>{" "}
              (3 años después de la expedición).
            </p>
          )}

          <FileUpload
            label="Foto de la licencia"
            folder="driver-license"
            token={token}
            value={fileKey || null}
            onChange={(key) => setFileKey(key ?? "")}
          />

          {fileKey && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Vista previa
              </p>
              <SecureImage
                fileKey={fileKey}
                token={token}
                alt="Licencia de conducción"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar licencia"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function MiLicenciaPage() {
  return (
    <ProtectedRoute allowedRoles={DRIVER_ROLES} redirectTo="/dashboard">
      <MiLicenciaContent />
    </ProtectedRoute>
  );
}

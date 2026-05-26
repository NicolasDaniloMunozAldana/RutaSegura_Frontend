"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  RouteAssignmentRecord,
  RouteRecord,
  StudentRecord,
  routesAPI,
  studentsAPI,
} from "@/lib/api";
import { confirmDialog, showErrorDialog, showSuccessDialog } from "./dialogs";

type RouteAssignmentsModalProps = {
  route: RouteRecord;
  token: string;
  canManage: boolean;
  onClose: () => void;
};

function isAssignmentActive(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
}

function studentFullName(student: {
  firstName: string;
  firstLastname: string;
}): string {
  return `${student.firstName} ${student.firstLastname}`.trim();
}

function assignmentStatusBadge(status: string | null | undefined) {
  const active = isAssignmentActive(status);
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      }
    >
      <span
        className={
          active
            ? "size-1.5 rounded-full bg-emerald-600"
            : "size-1.5 rounded-full bg-slate-500"
        }
      />
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

export default function RouteAssignmentsModal({
  route,
  token,
  canManage,
  onClose,
}: RouteAssignmentsModalProps) {
  const [assignments, setAssignments] = useState<RouteAssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const routeActive = isAssignmentActive(route.status);
  const canAssign = canManage && routeActive;

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await routesAPI.listAssignments(route.id, token);
      setAssignments(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las asignaciones";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [route.id, token]);

  const loadStudents = useCallback(async () => {
    if (!canAssign || route.zoneId === null) {
      setStudents([]);
      return;
    }

    try {
      setStudentsError(null);
      const response = await studentsAPI.findByZone(route.zoneId, token);
      setStudents(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los estudiantes de la zona";
      setStudentsError(message);
    }
  }, [canAssign, route.zoneId, token]);

  useEffect(() => {
    void loadAssignments();
    void loadStudents();
  }, [loadAssignments, loadStudents]);

  const assignedActivePersonIds = useMemo(() => {
    return new Set(
      assignments
        .filter((assignment) => isAssignmentActive(assignment.status))
        .map((assignment) => assignment.personId),
    );
  }, [assignments]);

  const availableStudents = useMemo(() => {
    return students.filter(
      (student) => !assignedActivePersonIds.has(student.id),
    );
  }, [students, assignedActivePersonIds]);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === selectedPersonId),
    [students, selectedPersonId],
  );

  function handleSelectStudent(value: string) {
    setSelectedPersonId(value);
    setSelectedAddressId("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedPersonId) {
      setSubmitError("Selecciona un estudiante.");
      return;
    }

    if (!selectedAddressId) {
      setSubmitError("Selecciona una dirección del estudiante.");
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError(null);
      await routesAPI.createAssignment(
        route.id,
        {
          personId: Number(selectedPersonId),
          personAddressId: Number(selectedAddressId),
        },
        token,
      );
      setSelectedPersonId("");
      setSelectedAddressId("");
      await loadAssignments();
      showSuccessDialog("Estudiante asignado correctamente.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo asignar el estudiante";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleInactivate(assignment: RouteAssignmentRecord) {
    const confirmed = await confirmDialog({
      title: "¿Retirar estudiante?",
      text: "Esta acción inactivará la asignación del estudiante en esta ruta.",
      confirmButtonText: "Sí, retirar",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed) return;

    try {
      await routesAPI.inactivateAssignment(route.id, assignment.id, token);
      await loadAssignments();
      showSuccessDialog("Asignación inactivada correctamente.");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo inactivar la asignación";
      showErrorDialog(message);
    }
  }

  async function handleReactivate(assignment: RouteAssignmentRecord) {
    const confirmed = await confirmDialog({
      title: "¿Reactivar asignación?",
      text: "El estudiante volverá a estar activo en esta ruta.",
      confirmButtonText: "Sí, reactivar",
      confirmButtonColor: "#059669",
    });
    if (!confirmed) return;

    try {
      await routesAPI.updateAssignment(
        route.id,
        assignment.id,
        { status: "ACTIVE" },
        token,
      );
      await loadAssignments();
      showSuccessDialog("Asignación reactivada correctamente.");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo reactivar la asignación";
      showErrorDialog(message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Asignaciones de la Ruta
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {route.name} · {route.zone?.name ?? "Sin zona"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {canManage && !routeActive && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            La ruta está inactiva. Actívala para poder asignar estudiantes.
          </div>
        )}

        {canAssign && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
              Asignar Estudiante
            </h4>

            {studentsError && (
              <p className="mb-3 text-sm font-medium text-red-600">
                {studentsError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Estudiante
                </label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                >
                  <option value="">Selecciona un estudiante</option>
                  {availableStudents.map((student) => (
                    <option key={student.id} value={String(student.id)}>
                      {studentFullName(student)}
                    </option>
                  ))}
                </select>
                {availableStudents.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No hay estudiantes disponibles en esta zona.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Dirección
                </label>
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  disabled={!selectedStudent}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Selecciona una dirección</option>
                  {selectedStudent?.personAddresses.map((personAddress) => (
                    <option
                      key={personAddress.id}
                      value={String(personAddress.id)}
                    >
                      {personAddress.address.address}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {submitError && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {submitError}
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitLoading}
                className="inline-flex items-center gap-2 bg-[#003D7A] hover:bg-[#0066CC] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  person_add
                </span>
                {submitLoading ? "Asignando..." : "Asignar"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Estudiante
                </th>
                <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                {canManage && (
                  <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Cargando asignaciones...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-4 py-10 text-center text-sm text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && assignments.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Esta ruta aún no tiene estudiantes asignados.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                      {assignment.person
                        ? studentFullName(assignment.person)
                        : "Estudiante desconocido"}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">
                      {assignment.personAddress?.address?.address ??
                        "Sin dirección"}
                    </td>
                    <td className="px-4 py-2.5">
                      {assignmentStatusBadge(assignment.status)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        {isAssignmentActive(assignment.status) ? (
                          <button
                            onClick={() => handleInactivate(assignment)}
                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                            title="Retirar de la ruta"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              person_remove
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(assignment)}
                            disabled={!routeActive}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              routeActive
                                ? "Reactivar asignación"
                                : "Activa la ruta para reactivar"
                            }
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              person_add
                            </span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#003D7A] hover:bg-[#0066CC] text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}


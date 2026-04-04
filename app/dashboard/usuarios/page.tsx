"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  UpdateUserPayload,
  UserPayload,
  UserPerson,
  UserRecord,
  UserRole,
  usersAPI,
} from "@/lib/api";

type FormState = {
  email: string;
  password: string;
  personId: string;
  roleId: string;
  pickupEnabled: boolean;
};

const initialForm: FormState = {
  email: "",
  password: "",
  personId: "",
  roleId: "",
  pickupEnabled: false,
};

function personName(person: UserPerson): string {
  return [
    person.firstName,
    person.middleName,
    person.firstLastname,
    person.secondLastname,
  ]
    .filter(Boolean)
    .join(" ");
}

function statusBadge(status: string | null | undefined) {
  const isActive = status?.toLowerCase() === "active";
  return (
    <span
      className={
        isActive
          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      }
    >
      <span
        className={
          isActive
            ? "size-1.5 rounded-full bg-emerald-600"
            : "size-1.5 rounded-full bg-slate-500"
        }
      />
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function isUserActive(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
}

function roleLabel(roleName: string | null | undefined): string {
  return roleName ? roleName.toUpperCase() : "SIN ROL";
}

function toCreatePayload(form: FormState): UserPayload {
  return {
    email: form.email.trim(),
    password: form.password,
    personId: Number(form.personId),
    roleId: Number(form.roleId),
    pickupEnabled: form.pickupEnabled,
  };
}

function toUpdatePayload(form: FormState): UpdateUserPayload {
  const payload: UpdateUserPayload = {
    email: form.email.trim(),
    personId: Number(form.personId),
    roleId: Number(form.roleId),
    pickupEnabled: form.pickupEnabled,
  };

  if (form.password.trim()) {
    payload.password = form.password;
  }

  return payload;
}

async function confirmDialog(options: {
  title: string;
  text: string;
  confirmButtonText: string;
  confirmButtonColor: string;
}) {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: "Cancelar",
    confirmButtonColor: options.confirmButtonColor,
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });

  return result.isConfirmed;
}

function showErrorDialog(message: string) {
  void Swal.fire({
    title: "Ocurrió un problema",
    text: message,
    icon: "error",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#0F2B4B",
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });
}

function showSuccessDialog(message: string) {
  void Swal.fire({
    title: "Operación exitosa",
    text: message,
    icon: "success",
    timer: 1600,
    showConfirmButton: false,
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });
}

export default function UsuariosPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [availablePersons, setAvailablePersons] = useState<UserPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const personOptions = useMemo(() => {
    if (!isEditMode || !selectedUser) {
      return availablePersons;
    }

    const currentPersonExists = availablePersons.some(
      (person) => person.id === selectedUser.person.id,
    );

    if (currentPersonExists) {
      return availablePersons;
    }

    return [selectedUser.person, ...availablePersons];
  }, [availablePersons, isEditMode, selectedUser]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const name = personName(user.person).toLowerCase();
      const idText = String(user.id);
      const email = user.email.toLowerCase();
      const role = (user.role.name ?? "").toLowerCase();
      const status = (user.status ?? "").toLowerCase();

      const searchPass =
        !normalizedQuery ||
        name.includes(normalizedQuery) ||
        idText.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        role.includes(normalizedQuery);

      const statusPass = !statusFilter || status === statusFilter;

      return searchPass && statusPass;
    });
  }, [users, query, statusFilter]);

  const loadUsers = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.findAll(token);
      setUsers(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los usuarios";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadCatalogs = useCallback(async () => {
    if (!token) return;

    try {
      const [rolesResponse, personsResponse] = await Promise.all([
        usersAPI.findRoles(token),
        usersAPI.findAvailablePersons(token),
      ]);

      setRoles(rolesResponse.data);
      setAvailablePersons(personsResponse.data);
    } catch {
      setRoles([]);
      setAvailablePersons([]);
    }
  }, [token]);

  useEffect(() => {
    void loadUsers();
    void loadCatalogs();
  }, [loadUsers, loadCatalogs]);

  function openCreateModal() {
    setIsEditMode(false);
    setSelectedId(null);
    setSelectedUser(null);
    setSubmitError(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function openEditModal(user: UserRecord) {
    setIsEditMode(true);
    setSelectedId(user.id);
    setSelectedUser(user);
    setSubmitError(null);
    setForm({
      email: user.email,
      password: "",
      personId: String(user.person.id),
      roleId: String(user.role.id),
      pickupEnabled: user.pickupEnabled,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitLoading) return;
    setIsModalOpen(false);
  }

  async function reloadData() {
    await Promise.all([loadUsers(), loadCatalogs()]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);

      if (!form.personId || !form.roleId) {
        setSubmitError("Selecciona una persona y un rol para continuar.");
        return;
      }

      if (!isEditMode && form.password.trim().length < 6) {
        setSubmitError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      if (isEditMode && selectedId) {
        const payload = toUpdatePayload(form);
        await usersAPI.update(selectedId, payload, token);
        showSuccessDialog("Usuario actualizado correctamente.");
      } else {
        const payload = toCreatePayload(form);
        await usersAPI.create(payload, token);
        showSuccessDialog("Usuario creado correctamente.");
      }

      await reloadData();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el usuario";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleInactivate(userId: number) {
    if (!token) return;

    const confirmed = await confirmDialog({
      title: "¿Inactivar usuario?",
      text: "Esta acción inactivará el usuario y bloqueará su acceso al sistema.",
      confirmButtonText: "Sí, inactivar",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    try {
      await usersAPI.inactivate(userId, token);
      await reloadData();
      showSuccessDialog("Usuario inactivado correctamente.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo inactivar el usuario";
      showErrorDialog(message);
    }
  }

  async function handleActivate(userId: number) {
    if (!token) return;

    const confirmed = await confirmDialog({
      title: "¿Habilitar usuario?",
      text: "Esta acción permitirá nuevamente el acceso del usuario al sistema.",
      confirmButtonText: "Sí, habilitar",
      confirmButtonColor: "#059669",
    });

    if (!confirmed) return;

    try {
      await usersAPI.activate(userId, token);
      await reloadData();
      showSuccessDialog("Usuario habilitado correctamente.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo habilitar el usuario";
      showErrorDialog(message);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]} redirectTo="/dashboard">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h3>
            <p className="text-sm text-slate-500 mt-0.5">{users.length} usuarios registrados</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-[#0F2B4B] hover:bg-[#163a63] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] cursor-pointer">add</span>
            Registrar Usuario
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o rol"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
            />
          </div>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Correo</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Persona</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pickup</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                    Aún no hay usuarios registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{user.email}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{personName(user.person)}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{user.person.personType}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{roleLabel(user.role.name)}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{user.pickupEnabled ? "Sí" : "No"}</td>
                    <td className="px-5 py-3">{statusBadge(user.status)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg hover:bg-[#0F2B4B] hover:text-white text-slate-400 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        {isUserActive(user.status) ? (
                          <button
                            onClick={() => handleInactivate(user.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                            title="Inactivar"
                          >
                            <span className="material-symbols-outlined text-[16px]">block</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors cursor-pointer"
                            title="Habilitar"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-500 font-medium">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={closeModal}>
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">
                  {isEditMode ? "Editar Usuario" : "Registrar Usuario"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Correo</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Contraseña {isEditMode ? "(opcional)" : ""}
                    </label>
                    <input
                      type="password"
                      required={!isEditMode}
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder={isEditMode ? "Dejar en blanco para conservar" : "Mínimo 6 caracteres"}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Persona asociada</label>
                    <select
                      required
                      value={form.personId}
                      onChange={(e) => setForm((prev) => ({ ...prev, personId: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                    >
                      <option value="">Seleccionar persona...</option>
                      {personOptions.map((person) => (
                        <option key={person.id} value={person.id}>
                          {personName(person)} ({person.personType})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Solo se listan personas de tipo conductor/coordinador disponibles.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rol</label>
                    <select
                      required
                      value={form.roleId}
                      onChange={(e) => setForm((prev) => ({ ...prev, roleId: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                    >
                      <option value="">Seleccionar rol...</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {roleLabel(role.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.pickupEnabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, pickupEnabled: e.target.checked }))}
                      className="size-4 rounded border-slate-300 text-[#0F2B4B] focus:ring-[#0F2B4B]/30"
                    />
                    <span className="text-sm text-slate-700 font-medium">Pickup habilitado</span>
                  </label>
                </div>

                {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
                  >
                    {submitLoading ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

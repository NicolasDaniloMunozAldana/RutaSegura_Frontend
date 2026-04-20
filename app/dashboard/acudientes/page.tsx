"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import { GuardianPayload, GuardianRecord, guardiansAPI } from "@/lib/api";

type FormState = {
	firstName: string;
	middleName: string;
	firstLastname: string;
	secondLastname: string;
	phone: string;
	email: string;
	documentType: string;
	documentNumber: string;
	documentDescription: string;
};

const initialForm: FormState = {
	firstName: "",
	middleName: "",
	firstLastname: "",
	secondLastname: "",
	phone: "",
	email: "",
	documentType: "CC",
	documentNumber: "",
	documentDescription: "",
};

const DOCUMENT_TYPES = ["CC", "TI", "CE", "PASAPORTE"] as const;

function getDocumentTypeName(documentType: unknown): string {
	if (typeof documentType === "string") {
		return documentType;
	}

	if (
		typeof documentType === "object" &&
		documentType !== null &&
		"name" in documentType &&
		typeof (documentType as { name?: unknown }).name === "string"
	) {
		return (documentType as { name: string }).name;
	}

	return "";
}

function getDocumentTypeCode(documentType: unknown): string | null {
	const normalized = getDocumentTypeName(documentType).trim().toUpperCase();

	if (!normalized) {
		return null;
	}

	if (
		normalized === "CC" ||
		normalized === "CEDULA" ||
		normalized === "CEDULA DE CIUDADANIA" ||
		normalized === "CEDULA_DE_CIUDADANIA"
	) {
		return "CC";
	}

	if (
		normalized === "TI" ||
		normalized === "TARJETA IDENTIDAD" ||
		normalized === "TARJETA DE IDENTIDAD" ||
		normalized === "TARJETA_IDENTIDAD"
	) {
		return "TI";
	}

	if (
		normalized === "CE" ||
		normalized === "CEDULA EXTRANJERIA" ||
		normalized === "CEDULA DE EXTRANJERIA" ||
		normalized === "CEDULA_EXTRANJERIA"
	) {
		return "CE";
	}

	if (normalized === "PASAPORTE") {
		return "PASAPORTE";
	}

	return null;
}

function isNumericDocumentType(documentType: string): boolean {
	return documentType === "CC" || documentType === "TI" || documentType === "CE";
}

function formatDocumentTypeLabel(documentType: unknown): string {
	const code = getDocumentTypeCode(documentType);

	if (code === "PASAPORTE") {
		return "Pasaporte";
	}

	if (code) {
		return code;
	}

	return getDocumentTypeName(documentType);
}

function fullName(guardian: GuardianRecord): string {
	return [
		guardian.firstName,
		guardian.middleName,
		guardian.firstLastname,
		guardian.secondLastname,
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

function isGuardianActive(status: string | null | undefined) {
	return status?.toLowerCase() === "active";
}

function mapGuardianToForm(guardian: GuardianRecord): FormState {
	return {
		firstName: guardian.firstName ?? "",
		middleName: guardian.middleName ?? "",
		firstLastname: guardian.firstLastname ?? "",
		secondLastname: guardian.secondLastname ?? "",
		phone: guardian.phone ?? "",
		email: guardian.email ?? "",
		documentType: getDocumentTypeCode(guardian.document?.documentType) ?? "CC",
		documentNumber: guardian.document?.documentNumber ?? "",
		documentDescription: guardian.document?.description ?? "",
	};
}

function toPayload(form: FormState): GuardianPayload {
	const normalizedDocumentNumber = isNumericDocumentType(form.documentType)
		? form.documentNumber.replace(/\D/g, "")
		: form.documentNumber;

	return {
		firstName: form.firstName.trim(),
		middleName: form.middleName.trim() || undefined,
		firstLastname: form.firstLastname.trim(),
		secondLastname: form.secondLastname.trim() || undefined,
		phone: form.phone.trim() || undefined,
		email: form.email.trim(),
		document: {
			documentType: form.documentType.trim(),
			documentNumber: normalizedDocumentNumber.trim(),
			description: form.documentDescription.trim() || undefined,
		},
	};
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

export default function AcudientesPage() {
	const { token } = useAuth();
	const [guardians, setGuardians] = useState<GuardianRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(initialForm);
	const [submitLoading, setSubmitLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const filteredGuardians = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return guardians.filter((guardian) => {
			const name = fullName(guardian).toLowerCase();
			const idText = String(guardian.id);
			const email = (guardian.email ?? "").toLowerCase();
			const documentNumber = (guardian.document?.documentNumber ?? "").toLowerCase();
			const status = (guardian.status ?? "").toLowerCase();

			const searchPass =
				!normalizedQuery ||
				name.includes(normalizedQuery) ||
				idText.includes(normalizedQuery) ||
				email.includes(normalizedQuery) ||
				documentNumber.includes(normalizedQuery);

			const statusPass = !statusFilter || status === statusFilter;

			return searchPass && statusPass;
		});
	}, [guardians, query, statusFilter]);

	const loadGuardians = useCallback(async () => {
		if (!token) return;

		try {
			setLoading(true);
			setError(null);
			const response = await guardiansAPI.findAll(token);
			setGuardians(response.data);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "No se pudieron cargar los acudientes";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		void loadGuardians();
	}, [loadGuardians]);

	function openCreateModal() {
		setIsEditMode(false);
		setSelectedId(null);
		setSubmitError(null);
		setForm(initialForm);
		setIsModalOpen(true);
	}

	function openEditModal(guardian: GuardianRecord) {
		setIsEditMode(true);
		setSelectedId(guardian.id);
		setSubmitError(null);
		setForm(mapGuardianToForm(guardian));
		setIsModalOpen(true);
	}

	function closeModal() {
		if (submitLoading) return;
		setIsModalOpen(false);
	}

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!token) return;

		try {
			setSubmitLoading(true);
			setSubmitError(null);

			const payload = toPayload(form);

			if (isEditMode && selectedId) {
				await guardiansAPI.update(selectedId, payload, token);
				showSuccessDialog("Acudiente actualizado correctamente.");
			} else {
				await guardiansAPI.create(payload, token);
				showSuccessDialog("Acudiente registrado correctamente.");
			}

			await loadGuardians();
			setIsModalOpen(false);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "No se pudo guardar el acudiente";
			setSubmitError(message);
		} finally {
			setSubmitLoading(false);
		}
	}

	async function handleInactivate(guardianId: number) {
		if (!token) return;
		const confirmed = await confirmDialog({
			title: "¿Inactivar acudiente?",
			text: "Esta acción inactivará el acudiente y limitará su uso en el sistema.",
			confirmButtonText: "Sí, inactivar",
			confirmButtonColor: "#dc2626",
		});
		if (!confirmed) return;

		try {
			await guardiansAPI.inactivate(guardianId, token);
			await loadGuardians();
			showSuccessDialog("Acudiente inactivado correctamente.");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "No se pudo inactivar el acudiente";
			showErrorDialog(message);
		}
	}

	async function handleActivate(guardianId: number) {
		if (!token) return;
		const confirmed = await confirmDialog({
			title: "¿Habilitar acudiente?",
			text: "Esta acción permitirá nuevamente el uso del acudiente en el sistema.",
			confirmButtonText: "Sí, habilitar",
			confirmButtonColor: "#059669",
		});
		if (!confirmed) return;

		try {
			await guardiansAPI.activate(guardianId, token);
			await loadGuardians();
			showSuccessDialog("Acudiente habilitado correctamente.");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "No se pudo habilitar el acudiente";
			showErrorDialog(message);
		}
	}

	return (
		<div className="p-8">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h3 className="text-xl font-bold text-slate-800">Gestión de Acudientes</h3>
					<p className="text-sm text-slate-500 mt-0.5">{guardians.length} acudientes registrados</p>
				</div>
				<button
					onClick={openCreateModal}
					className="bg-[#0F2B4B] hover:bg-[#163a63] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
				>
					<span className="material-symbols-outlined text-[18px] cursor-pointer">add</span>
					Registrar Acudiente
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
						placeholder="Buscar por nombre"
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
							<th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
							<th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
							<th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Correo</th>
							<th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
							<th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
							<th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{loading && (
							<tr>
								<td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
									Cargando acudientes...
								</td>
							</tr>
						)}

						{!loading && error && (
							<tr>
								<td colSpan={6} className="px-5 py-14 text-center text-sm text-red-600">
									{error}
								</td>
							</tr>
						)}

						{!loading && !error && filteredGuardians.length === 0 && (
							<tr>
								<td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
									Aún no hay acudientes registrados.
								</td>
							</tr>
						)}

						{!loading &&
							!error &&
							filteredGuardians.map((guardian) => (
								<tr key={guardian.id} className="hover:bg-slate-50 transition-colors">
									<td className="px-5 py-3 text-sm font-medium text-slate-800">{fullName(guardian)}</td>
									<td className="px-5 py-3 text-sm text-slate-600">
										{guardian.document
											? `${formatDocumentTypeLabel(guardian.document.documentType)} ${guardian.document.documentNumber}`
											: "Sin documento"}
									</td>
									<td className="px-5 py-3 text-sm text-slate-600">{guardian.email ?? "Sin correo"}</td>
									<td className="px-5 py-3 text-sm text-slate-600">{guardian.phone ?? "Sin teléfono"}</td>
									<td className="px-5 py-3">{statusBadge(guardian.status)}</td>
									<td className="px-5 py-3 text-right">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => openEditModal(guardian)}
												className="p-1.5 rounded-lg hover:bg-[#0F2B4B] hover:text-white text-slate-400 transition-colors cursor-pointer"
												title="Editar"
											>
												<span className="material-symbols-outlined text-[16px]">edit</span>
											</button>
											{isGuardianActive(guardian.status) ? (
												<button
													onClick={() => handleInactivate(guardian.id)}
													className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
													title="Inactivar"
												>
													<span className="material-symbols-outlined text-[16px]">block</span>
												</button>
											) : (
												<button
													onClick={() => handleActivate(guardian.id)}
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
					Mostrando {filteredGuardians.length} de {guardians.length} acudientes
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
								{isEditMode ? "Editar Acudiente" : "Registrar Acudiente"}
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
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
									<input
										type="email"
										required
										value={form.email}
										onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
									<input
										type="text"
										value={form.phone}
										onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Primer Nombre</label>
									<input
										type="text"
										required
										value={form.firstName}
										onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Segundo Nombre</label>
									<input
										type="text"
										value={form.middleName}
										onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Primer Apellido</label>
									<input
										type="text"
										required
										value={form.firstLastname}
										onChange={(e) => setForm((prev) => ({ ...prev, firstLastname: e.target.value }))}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Segundo Apellido</label>
									<input
										type="text"
										value={form.secondLastname}
										onChange={(e) => setForm((prev) => ({ ...prev, secondLastname: e.target.value }))}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo Documento</label>
									<select
										value={form.documentType}
										onChange={(e) =>
											setForm((prev) => {
												const nextDocumentType = e.target.value;
												return {
													...prev,
													documentType: nextDocumentType,
													documentNumber: isNumericDocumentType(nextDocumentType)
														? prev.documentNumber.replace(/\D/g, "")
														: prev.documentNumber,
												};
											})
										}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									>
										{DOCUMENT_TYPES.map((type) => (
											<option key={type} value={type}>
												{type === "PASAPORTE" ? "Pasaporte" : type}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Número Documento</label>
									<input
										type="text"
										required
										inputMode={isNumericDocumentType(form.documentType) ? "numeric" : "text"}
										pattern={isNumericDocumentType(form.documentType) ? "[0-9]*" : undefined}
										value={form.documentNumber}
										onChange={(e) =>
											setForm((prev) => ({
												...prev,
												documentNumber: isNumericDocumentType(prev.documentType)
													? e.target.value.replace(/\D/g, "")
													: e.target.value,
											}))
										}
										className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Descripción Documento</label>
								<input
									type="text"
									value={form.documentDescription}
									onChange={(e) => setForm((prev) => ({ ...prev, documentDescription: e.target.value }))}
									className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
								/>
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
	);
}

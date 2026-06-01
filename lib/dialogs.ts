import Swal from "sweetalert2";

const baseCustomClass = {
  popup: "rounded-2xl",
  title: "text-slate-800",
  htmlContainer: "text-slate-600",
};

export async function confirmDialog(options: {
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
    customClass: baseCustomClass,
  });

  return result.isConfirmed;
}

// Pide un texto obligatorio (p. ej. el motivo de un rechazo).
export async function promptDialog(options: {
  title: string;
  inputLabel: string;
  confirmButtonText: string;
  confirmButtonColor: string;
  placeholder?: string;
}): Promise<string | null> {
  const result = await Swal.fire({
    title: options.title,
    input: "textarea",
    inputLabel: options.inputLabel,
    inputPlaceholder: options.placeholder ?? "",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: "Cancelar",
    confirmButtonColor: options.confirmButtonColor,
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    inputValidator: (value) =>
      value && value.trim() ? null : "Debes escribir un motivo",
    customClass: baseCustomClass,
  });

  return result.isConfirmed ? (result.value as string).trim() : null;
}

export function showErrorDialog(message: string) {
  void Swal.fire({
    title: "Ocurrió un problema",
    text: message,
    icon: "error",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#0F2B4B",
    customClass: baseCustomClass,
  });
}

export function showSuccessDialog(message: string) {
  void Swal.fire({
    title: "Operación exitosa",
    text: message,
    icon: "success",
    timer: 1600,
    showConfirmButton: false,
    customClass: baseCustomClass,
  });
}

import Swal from "sweetalert2";

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
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });

  return result.isConfirmed;
}

export function showErrorDialog(message: string) {
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

export function showSuccessDialog(message: string) {
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

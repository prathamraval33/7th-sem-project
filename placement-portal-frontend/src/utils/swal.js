import Swal from "sweetalert2";

// Custom styled SweetAlert2 helper functions
export const showConfirm = async ({
  title = "Are you sure?",
  text = "You won't be able to revert this!",
  icon = "warning",
  confirmButtonText = "Yes, proceed",
  cancelButtonText = "Cancel",
  confirmButtonColor = "#2563eb",
}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor: "#64748b",
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      popup: "rounded-2xl font-sans shadow-xl border border-slate-100",
      title: "text-lg font-bold text-slate-900 font-heading",
      htmlContainer: "text-sm text-slate-600",
      confirmButton: "px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm",
      cancelButton: "px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm",
    },
  });
  return result.isConfirmed;
};

export const showSuccess = (title = "Success!", text = "") => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonColor: "#059669",
    customClass: {
      popup: "rounded-2xl font-sans shadow-xl border border-slate-100",
      title: "text-lg font-bold text-slate-900 font-heading",
      htmlContainer: "text-sm text-slate-600",
      confirmButton: "px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm",
    },
  });
};

export const showError = (title = "Error!", text = "Something went wrong.") => {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#dc2626",
    customClass: {
      popup: "rounded-2xl font-sans shadow-xl border border-slate-100",
      title: "text-lg font-bold text-slate-900 font-heading",
      htmlContainer: "text-sm text-slate-600",
      confirmButton: "px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm",
    },
  });
};

export const showToast = (title = "Updated successfully", icon = "success") => {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
  return Toast.fire({
    icon,
    title,
  });
};

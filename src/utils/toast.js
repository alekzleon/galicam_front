import { toast } from "sonner";

export const notifySuccess = (message) => {
  toast.success(message);
};

export const notifyError = (message) => {
  toast.error(message);
};

export const notifyWarning = (message) => {
  toast.warning(message);
};

export const notifyInfo = (message) => {
  toast(message);
};

export const notifyPromise = (promise, messages = {}) => {
  return toast.promise(promise, {
    loading: messages.loading || "Procesando...",
    success: messages.success || "Operación completada correctamente",
    error: messages.error || "Ocurrió un error",
  });
};
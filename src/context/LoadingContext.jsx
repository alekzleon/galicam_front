/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import LoadingOverlay from "../components/loading/LoadingOverlay";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    show: false,
    text: "Procesando...",
  });

  const showLoading = (text = "Procesando...") => {
    setLoadingState({
      show: true,
      text,
    });
  };

  const hideLoading = () => {
    setLoadingState((prev) => ({
      ...prev,
      show: false,
    }));
  };

  const withLoading = async (callback, text = "Procesando...") => {
    try {
      showLoading(text);
      return await callback();
    } finally {
      hideLoading();
    }
  };

  const value = {
    showLoading,
    hideLoading,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingOverlay show={loadingState.show} text={loadingState.text} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useLoading debe usarse dentro de LoadingProvider");
  }

  return context;
}

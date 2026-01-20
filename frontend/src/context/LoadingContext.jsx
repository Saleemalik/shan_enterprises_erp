import { createContext, useContext, useRef, useState } from "react";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const delayTimerRef = useRef(null);
  const maxTimerRef = useRef(null);

  const startLoading = () => {
    // Delay loader (anti-flicker)
    delayTimerRef.current = setTimeout(() => {
      setLoadingCount((c) => c + 1);
    }, 300);

    // Max safety timeout (30s)
    maxTimerRef.current = setTimeout(() => {
      console.warn("⏱ Loader force-stopped after 30 seconds");
      setLoadingCount(0);
    }, 20000);
  };

  const stopLoading = () => {
    clearTimeout(delayTimerRef.current);
    clearTimeout(maxTimerRef.current);

    setLoadingCount((c) => Math.max(c - 1, 0));
  };

  return (
    <LoadingContext.Provider
      value={{
        loading: loadingCount > 0,
        startLoading,
        stopLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);

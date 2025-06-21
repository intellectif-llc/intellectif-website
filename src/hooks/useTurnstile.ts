import { useState, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

interface TurnstileState {
  token: string | null;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useTurnstile = () => {
  const [state, setState] = useState<TurnstileState>({
    token: null,
    isVerified: false,
    isLoading: false,
    error: null,
  });

  const turnstileRef = useRef<{
    reset: () => void;
    getToken: () => string | null;
  } | null>(null);

  const reset = useCallback(() => {
    setState({
      token: null,
      isVerified: false,
      isLoading: false,
      error: null,
    });

    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, []);

  const handleSuccess = useCallback((token: string) => {
    setState((prev) => ({
      ...prev,
      token,
      isVerified: true,
      isLoading: false,
      error: null,
    }));
  }, []);

  const handleError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      token: null,
      isVerified: false,
      isLoading: false,
      error: "Security verification failed. Please try again.",
    }));
  }, []);

  const handleExpire = useCallback(() => {
    setState((prev) => ({
      ...prev,
      token: null,
      isVerified: false,
      isLoading: false,
      error: "Security verification expired. Please complete it again.",
    }));

    // Auto-reset the widget
    reset();
  }, [reset]);

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!state.token) {
      setState((prev) => ({
        ...prev,
        error: "Please complete the security verification first.",
        isLoading: false,
      }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: state.token,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isVerified: true,
          error: null,
        }));

        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Security verification failed. Please try again.",
          token: null,
          isVerified: false,
        }));

        // Reset the widget to allow retry
        reset();

        toast.error("Security verification failed. Please try again.");
        return false;
      }
    } catch (_error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Network error. Please check your connection and try again.",
        token: null,
        isVerified: false,
      }));

      // Reset the widget to allow retry
      reset();

      toast.error("Network error. Please try again.");
      return false;
    }
  }, [state.token, reset]);

  return {
    ...state,
    handleSuccess,
    handleError,
    handleExpire: handleExpire,
    validateToken,
    reset,
    turnstileRef,
  };
};

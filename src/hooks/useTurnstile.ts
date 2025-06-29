"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";

interface TurnstileState {
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useTurnstile = () => {
  const [turnstileState, setTurnstileState] = useState<TurnstileState>({
    isVerified: false,
    isLoading: false,
    error: null,
  });

  const verifyToken = useCallback(async (token: string) => {
    setTurnstileState({ isLoading: true, isVerified: false, error: null });

    try {
      const response = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setTurnstileState({
          isLoading: false,
          isVerified: true,
          error: null,
        });
        toast.success("Security verification complete.");
      } else {
        throw new Error("Verification failed");
      }
    } catch (err) {
      const errorMessage =
        "Security verification failed. Please refresh and try again.";
      setTurnstileState({
        isLoading: false,
        isVerified: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
    }
  }, []);

  const handleSuccess = useCallback(
    (token: string) => {
      // Automatically verify the token on success
      verifyToken(token);
    },
    [verifyToken]
  );

  const handleError = useCallback(() => {
    const errorMessage =
      "Security widget failed to load. Please refresh the page.";
    setTurnstileState({
      isLoading: false,
      isVerified: false,
      error: errorMessage,
    });
    toast.error(errorMessage);
  }, []);

  const handleExpire = useCallback(() => {
    const errorMessage = "Security challenge expired. Please try again.";
    setTurnstileState({
      isLoading: false,
      isVerified: false,
      error: errorMessage,
    });
    toast.error(errorMessage);
  }, []);

  const reset = useCallback(() => {
    setTurnstileState({
      isVerified: false,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...turnstileState,
    handleSuccess,
    handleError,
    handleExpire,
    reset,
  };
};

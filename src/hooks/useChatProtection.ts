"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getChatSession,
  storeChatSession,
  refreshChatSession,
  shouldRefreshSession,
  clearChatSession,
  hasValidChatSession,
  getChatSessionInfo,
  CHAT_SESSION_CONFIG,
  type ChatSession,
} from "@/utils/chatSessionStorage";

interface ChatProtectionState {
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  sessionInfo: ReturnType<typeof getChatSessionInfo>;
  lastRefresh: Date | null;
  refreshCount: number;
}

interface ChatProtectionHook extends ChatProtectionState {
  verifyToken: (token: string, isRefresh?: boolean) => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  clearSession: () => void;
  retryVerification: () => void;
  getSessionToken: () => string | null;
}

export const useChatProtection = (): ChatProtectionHook => {
  const [state, setState] = useState<ChatProtectionState>({
    isVerified: false,
    isLoading: false,
    error: null,
    sessionInfo: { hasSession: false, isValid: false },
    lastRefresh: null,
    refreshCount: 0,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Initialize and check existing session
  useEffect(() => {
    console.log("🚀 ChatProtection: Hook initializing");

    const initializeSession = async () => {
      const hasExisting = checkExistingSession();

      // If no existing valid session, set loading state to trigger verification flow
      if (!hasExisting) {
        console.log(
          "🔄 ChatProtection: No valid session found, preparing for verification"
        );
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));
      }
    };

    initializeSession();

    return () => {
      // Cleanup refresh timeout on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        console.log("🧹 ChatProtection: Cleanup timeout on unmount");
      }
    };
  }, []);

  const checkExistingSession = useCallback(() => {
    try {
      console.log("🔍 ChatProtection: Checking existing session");

      const isValid = hasValidChatSession();
      const sessionInfo = getChatSessionInfo();
      const currentSession = getChatSession();

      console.log("📊 ChatProtection: Session check results", {
        isValid,
        sessionInfo,
        hasCurrentSession: !!currentSession,
      });

      setState((prev) => ({
        ...prev,
        isVerified: isValid,
        sessionInfo,
        refreshCount: currentSession?.refreshCount || 0,
        lastRefresh: currentSession?.lastRefresh
          ? new Date(currentSession.lastRefresh)
          : null,
        error: null,
      }));

      // Set up automatic refresh if session exists and is valid
      if (isValid && currentSession) {
        scheduleTokenRefresh(currentSession);
      }

      return isValid;
    } catch (error) {
      console.error(
        "❌ ChatProtection: Error checking existing session",
        error
      );
      setState((prev) => ({
        ...prev,
        isVerified: false,
        error: "Failed to check session",
        sessionInfo: { hasSession: false, isValid: false },
      }));
      return false;
    }
  }, []);

  const verifyToken = useCallback(
    async (token: string, isRefresh = false): Promise<boolean> => {
      console.log("🔐 ChatProtection: Starting token verification", {
        tokenLength: token.length,
        isRefresh,
        sessionId: sessionIdRef.current,
      });

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch("/api/turnstile/verify-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            sessionId: sessionIdRef.current,
            refreshAttempt: isRefresh,
          }),
        });

        console.log("📡 ChatProtection: Verification response received", {
          status: response.status,
          ok: response.ok,
          isRefresh,
        });

        const data = await response.json();

        if (data.success) {
          console.log("✅ ChatProtection: Verification successful", {
            isRefresh,
            challengeTs: data.challengeTs,
            hostname: data.hostname,
            sessionInfo: data.sessionInfo,
          });

          // Store or refresh session
          let session: ChatSession;
          if (isRefresh) {
            session = refreshChatSession(token) || storeChatSession(token);
          } else {
            session = storeChatSession(token);
          }

          setState((prev) => ({
            ...prev,
            isVerified: true,
            isLoading: false,
            error: null,
            sessionInfo: getChatSessionInfo(),
            refreshCount: session.refreshCount,
            lastRefresh: new Date(session.lastRefresh),
          }));

          // Schedule next refresh
          scheduleTokenRefresh(session);

          return true;
        } else {
          console.warn("⚠️ ChatProtection: Verification failed", {
            error: data.error,
            errorCodes: data.errorCodes,
            canRetry: data.canRetry,
            isRefresh,
          });

          setState((prev) => ({
            ...prev,
            isVerified: false,
            isLoading: false,
            error: data.error || "Verification failed",
            sessionInfo: { hasSession: false, isValid: false },
          }));

          // Clear invalid session
          clearChatSession();

          return false;
        }
      } catch (error) {
        console.error("💥 ChatProtection: Verification error", {
          error: error instanceof Error ? error.message : "Unknown error",
          isRefresh,
          sessionId: sessionIdRef.current,
        });

        setState((prev) => ({
          ...prev,
          isVerified: false,
          isLoading: false,
          error: "Network error during verification",
          sessionInfo: { hasSession: false, isValid: false },
        }));

        return false;
      }
    },
    []
  );

  const scheduleTokenRefresh = useCallback((session: ChatSession) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Check if refresh is needed
    if (shouldRefreshSession(session)) {
      console.log("🔄 ChatProtection: Immediate refresh needed");
      // Don't refresh immediately to avoid loops, schedule for soon
      refreshTimeoutRef.current = setTimeout(() => {
        refreshToken();
      }, 5000); // 5 second delay
      return;
    }

    // Calculate time until next refresh
    const now = Date.now();
    const nextRefreshTime =
      session.lastRefresh + CHAT_SESSION_CONFIG.REFRESH_INTERVAL;
    const timeUntilRefresh = Math.max(0, nextRefreshTime - now);

    console.log("⏰ ChatProtection: Scheduling token refresh", {
      currentTime: new Date(now).toISOString(),
      nextRefreshTime: new Date(nextRefreshTime).toISOString(),
      timeUntilRefresh: Math.round(timeUntilRefresh / 1000 / 60) + " minutes",
      refreshCount: session.refreshCount,
    });

    refreshTimeoutRef.current = setTimeout(() => {
      refreshToken();
    }, timeUntilRefresh);
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    console.log("🔄 ChatProtection: Starting background token refresh");

    const currentSession = getChatSession();
    if (!currentSession) {
      console.warn("⚠️ ChatProtection: No session to refresh");
      return false;
    }

    // Don't refresh if we've hit max retries
    if (currentSession.refreshCount >= CHAT_SESSION_CONFIG.MAX_RETRIES) {
      console.warn("⚠️ ChatProtection: Max refresh attempts reached", {
        refreshCount: currentSession.refreshCount,
        maxRetries: CHAT_SESSION_CONFIG.MAX_RETRIES,
      });
      clearSession();
      return false;
    }

    try {
      // Trigger a new invisible challenge by creating a temporary widget
      // This is a bit hacky but works for background refresh
      return new Promise((resolve) => {
        const tempDiv = document.createElement("div");
        tempDiv.style.display = "none";
        document.body.appendChild(tempDiv);

        // Use dynamic import to avoid SSR issues
        import("@marsidev/react-turnstile").then(({ Turnstile }) => {
          const React = require("react");
          const ReactDOM = require("react-dom/client");

          const root = ReactDOM.createRoot(tempDiv);

          const TempTurnstile = React.createElement(Turnstile, {
            siteKey: process.env.NEXT_PUBLIC_TURNSTILE_CHAT_SITE_KEY,
            onSuccess: async (token: string) => {
              console.log(
                "🔄 ChatProtection: Background refresh token received"
              );

              const success = await verifyToken(token, true);

              // Cleanup
              root.unmount();
              document.body.removeChild(tempDiv);

              resolve(success);
            },
            onError: () => {
              console.error("❌ ChatProtection: Background refresh failed");

              // Cleanup
              root.unmount();
              document.body.removeChild(tempDiv);

              resolve(false);
            },
            options: {
              theme: "light",
              size: "invisible",
              execution: "execute",
            },
          });

          root.render(TempTurnstile);
        });
      });
    } catch (error) {
      console.error("💥 ChatProtection: Background refresh error", error);
      return false;
    }
  }, [verifyToken]);

  const clearSession = useCallback(() => {
    console.log("🗑️ ChatProtection: Clearing session");

    clearChatSession();

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    setState({
      isVerified: false,
      isLoading: false,
      error: null,
      sessionInfo: { hasSession: false, isValid: false },
      lastRefresh: null,
      refreshCount: 0,
    });
  }, []);

  const retryVerification = useCallback(() => {
    console.log("🔄 ChatProtection: Retrying verification");
    setState((prev) => ({
      ...prev,
      error: null,
      isLoading: false,
    }));
  }, []);

  const getSessionToken = useCallback((): string | null => {
    const session = getChatSession();
    return session?.token || null;
  }, []);

  return {
    ...state,
    verifyToken,
    refreshToken,
    clearSession,
    retryVerification,
    getSessionToken,
  };
};

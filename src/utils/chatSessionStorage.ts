/**
 * Chat Session Storage Utilities
 * Manages secure session storage for chat protection tokens
 */

export interface ChatSession {
  token: string;
  verifiedAt: number;
  expiresAt: number;
  refreshCount: number;
  lastRefresh: number;
}

export const CHAT_SESSION_CONFIG = {
  TOKEN_LIFETIME: 2 * 60 * 60 * 1000, // 2 hours
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  STORAGE_KEY: "intellectif_chat_session",
  MIN_TOKEN_LENGTH: 50, // Minimum expected token length
} as const;

/**
 * Securely store chat session data
 */
export function storeChatSession(token: string): ChatSession {
  const now = Date.now();
  const session: ChatSession = {
    token,
    verifiedAt: now,
    expiresAt: now + CHAT_SESSION_CONFIG.TOKEN_LIFETIME,
    refreshCount: 0,
    lastRefresh: now,
  };

  try {
    sessionStorage.setItem(
      CHAT_SESSION_CONFIG.STORAGE_KEY,
      JSON.stringify(session)
    );
    console.log("💾 ChatSession: Stored new session", {
      tokenLength: token.length,
      expiresIn: CHAT_SESSION_CONFIG.TOKEN_LIFETIME / 1000 / 60 + " minutes",
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
    return session;
  } catch (error) {
    console.error("❌ ChatSession: Failed to store session", error);
    throw new Error("Failed to store chat session");
  }
}

/**
 * Retrieve chat session data if valid
 */
export function getChatSession(): ChatSession | null {
  try {
    const stored = sessionStorage.getItem(CHAT_SESSION_CONFIG.STORAGE_KEY);
    if (!stored) {
      console.log("📭 ChatSession: No stored session found");
      return null;
    }

    const session: ChatSession = JSON.parse(stored);
    const now = Date.now();

    // Validate session structure
    if (!session.token || !session.verifiedAt || !session.expiresAt) {
      console.warn("⚠️ ChatSession: Invalid session structure, clearing");
      clearChatSession();
      return null;
    }

    // Check if token is expired
    if (now > session.expiresAt) {
      console.warn("⏰ ChatSession: Session expired", {
        expiredAt: new Date(session.expiresAt).toISOString(),
        expiredAgo: (now - session.expiresAt) / 1000 / 60 + " minutes ago",
      });
      clearChatSession();
      return null;
    }

    // Validate token format
    if (session.token.length < CHAT_SESSION_CONFIG.MIN_TOKEN_LENGTH) {
      console.warn("⚠️ ChatSession: Token appears invalid, clearing", {
        tokenLength: session.token.length,
        minRequired: CHAT_SESSION_CONFIG.MIN_TOKEN_LENGTH,
      });
      clearChatSession();
      return null;
    }

    console.log("✅ ChatSession: Retrieved valid session", {
      tokenLength: session.token.length,
      expiresIn: Math.round((session.expiresAt - now) / 1000 / 60) + " minutes",
      refreshCount: session.refreshCount,
      lastRefresh: new Date(session.lastRefresh).toISOString(),
    });

    return session;
  } catch (error) {
    console.error("❌ ChatSession: Failed to retrieve session", error);
    clearChatSession();
    return null;
  }
}

/**
 * Check if session needs refresh
 */
export function shouldRefreshSession(session: ChatSession): boolean {
  const now = Date.now();
  const timeSinceRefresh = now - session.lastRefresh;
  const shouldRefresh = timeSinceRefresh > CHAT_SESSION_CONFIG.REFRESH_INTERVAL;

  console.log("🔄 ChatSession: Refresh check", {
    timeSinceLastRefresh: Math.round(timeSinceRefresh / 1000 / 60) + " minutes",
    shouldRefresh,
    refreshInterval:
      CHAT_SESSION_CONFIG.REFRESH_INTERVAL / 1000 / 60 + " minutes",
    refreshCount: session.refreshCount,
  });

  return shouldRefresh;
}

/**
 * Update session with refreshed token
 */
export function refreshChatSession(newToken: string): ChatSession | null {
  try {
    const currentSession = getChatSession();
    if (!currentSession) {
      console.warn("⚠️ ChatSession: No current session to refresh");
      return storeChatSession(newToken);
    }

    const now = Date.now();
    const refreshedSession: ChatSession = {
      ...currentSession,
      token: newToken,
      expiresAt: now + CHAT_SESSION_CONFIG.TOKEN_LIFETIME,
      refreshCount: currentSession.refreshCount + 1,
      lastRefresh: now,
    };

    sessionStorage.setItem(
      CHAT_SESSION_CONFIG.STORAGE_KEY,
      JSON.stringify(refreshedSession)
    );

    console.log("🔄 ChatSession: Refreshed session", {
      newTokenLength: newToken.length,
      refreshCount: refreshedSession.refreshCount,
      newExpiresAt: new Date(refreshedSession.expiresAt).toISOString(),
    });

    return refreshedSession;
  } catch (error) {
    console.error("❌ ChatSession: Failed to refresh session", error);
    return null;
  }
}

/**
 * Clear chat session data
 */
export function clearChatSession(): void {
  try {
    sessionStorage.removeItem(CHAT_SESSION_CONFIG.STORAGE_KEY);
    console.log("🗑️ ChatSession: Cleared session data");
  } catch (error) {
    console.error("❌ ChatSession: Failed to clear session", error);
  }
}

/**
 * Check if session exists and is valid
 */
export function hasValidChatSession(): boolean {
  const session = getChatSession();
  const isValid = session !== null;

  console.log("🔍 ChatSession: Validity check", {
    hasSession: !!session,
    isValid,
    sessionInfo: session
      ? {
          expiresIn:
            Math.round((session.expiresAt - Date.now()) / 1000 / 60) +
            " minutes",
          refreshCount: session.refreshCount,
        }
      : null,
  });

  return isValid;
}

/**
 * Get session info for debugging
 */
export function getChatSessionInfo(): {
  hasSession: boolean;
  isValid: boolean;
  expiresIn?: number;
  refreshCount?: number;
} {
  const session = getChatSession();

  if (!session) {
    return { hasSession: false, isValid: false };
  }

  const now = Date.now();
  const expiresIn = Math.round((session.expiresAt - now) / 1000 / 60);

  return {
    hasSession: true,
    isValid: true,
    expiresIn,
    refreshCount: session.refreshCount,
  };
}

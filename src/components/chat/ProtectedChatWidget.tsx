"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Script from "next/script";
import InvisibleTurnstile, {
  type InvisibleTurnstileRef,
} from "@/components/ui/InvisibleTurnstile";
import { useChatProtection } from "@/hooks/useChatProtection";

interface ProtectedChatWidgetProps {
  className?: string;
}

export default function ProtectedChatWidget({
  className = "",
}: ProtectedChatWidgetProps) {
  const [rocketChatLoaded, setRocketChatLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const turnstileRef = useRef<InvisibleTurnstileRef>(null);
  const verificationAttempts = useRef(0);
  const maxAttempts = 3;

  const {
    isVerified,
    isLoading,
    error,
    sessionInfo,
    verifyToken,
    retryVerification,
    clearSession,
  } = useChatProtection();

  console.log("🔧 ProtectedChatWidget: Render state", {
    isVerified,
    isLoading,
    hasError: !!error,
    error,
    sessionInfo,
    rocketChatLoaded,
    showFallback,
    verificationAttempts: verificationAttempts.current,
  });

  // Handle turnstile success
  const handleTurnstileSuccess = useCallback(
    async (token: string) => {
      console.log("✅ ProtectedChatWidget: Turnstile challenge completed", {
        tokenLength: token.length,
        attempt: verificationAttempts.current + 1,
      });

      // Guard against multiple submissions while a verification is in progress
      if (isLoading) {
        console.warn(
          "🔄 ProtectedChatWidget: Verification already in progress, ignoring redundant success event."
        );
        return;
      }

      verificationAttempts.current += 1;
      const success = await verifyToken(token, false);

      if (!success && verificationAttempts.current < maxAttempts) {
        console.log("🔄 ProtectedChatWidget: Verification failed, retrying", {
          attempt: verificationAttempts.current,
          maxAttempts,
        });

        setTimeout(() => {
          turnstileRef.current?.reset();
        }, 2000);
      } else if (!success) {
        console.error(
          "❌ ProtectedChatWidget: Max verification attempts reached"
        );
        setShowFallback(true);
      }
    },
    [isLoading, verifyToken, maxAttempts]
  );

  // Handle turnstile error
  const handleTurnstileError = useCallback(() => {
    console.error("❌ ProtectedChatWidget: Turnstile challenge failed", {
      attempt: verificationAttempts.current + 1,
      maxAttempts,
    });

    verificationAttempts.current += 1;

    if (verificationAttempts.current < maxAttempts) {
      console.log("🔄 ProtectedChatWidget: Retrying after turnstile error");
      setTimeout(() => {
        turnstileRef.current?.reset();
        retryVerification();
      }, 3000);
    } else {
      console.error("❌ ProtectedChatWidget: Max turnstile attempts reached");
      setShowFallback(true);
    }
  }, [retryVerification, maxAttempts]);

  // Handle turnstile expiry
  const handleTurnstileExpire = useCallback(() => {
    console.warn("⏰ ProtectedChatWidget: Turnstile challenge expired");

    // Don't count expiry as a failed attempt, just reset
    setTimeout(() => {
      turnstileRef.current?.reset();
    }, 1000);
  }, []);

  // Load Rocket.Chat when verified
  useEffect(() => {
    if (isVerified && !rocketChatLoaded) {
      console.log("🚀 ProtectedChatWidget: Loading Rocket.Chat widget");
      setRocketChatLoaded(true);
    }
  }, [isVerified, rocketChatLoaded]);

  // Handle retry from fallback
  const handleRetry = () => {
    console.log("🔄 ProtectedChatWidget: Manual retry triggered");

    setShowFallback(false);
    verificationAttempts.current = 0;
    clearSession();
    retryVerification();

    setTimeout(() => {
      turnstileRef.current?.reset();
      turnstileRef.current?.execute();
    }, 500);
  };

  // Render loading state
  if (
    (isLoading && !isVerified) ||
    (!isVerified &&
      !sessionInfo.hasSession &&
      !showFallback &&
      verificationAttempts.current === 0)
  ) {
    return (
      <>
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          <div className="bg-[#1e293b] bg-opacity-90 backdrop-blur-sm rounded-2xl p-4 border border-[#6bdcc0]/20 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#6bdcc0]"></div>
              <span className="text-[#6bdcc0] text-sm font-medium">
                Initializing secure chat...
              </span>
            </div>
          </div>
        </div>

        <InvisibleTurnstile
          ref={turnstileRef}
          onSuccess={handleTurnstileSuccess}
          onError={handleTurnstileError}
          onExpire={handleTurnstileExpire}
          autoExecute={true}
        />
      </>
    );
  }

  // Render error fallback
  if (showFallback || (error && verificationAttempts.current >= maxAttempts)) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <div className="bg-[#1e293b] bg-opacity-90 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20 shadow-xl max-w-sm">
          <div className="text-center">
            <div className="text-orange-400 text-2xl mb-2">💬</div>
            <h3 className="text-white text-sm font-semibold mb-2">
              Chat Temporarily Unavailable
            </h3>
            <p className="text-gray-300 text-xs mb-3">
              We're having trouble loading the chat widget. You can still reach
              us:
            </p>
            <div className="space-y-2">
              <a
                href="mailto:contact@intellectif.com"
                className="block bg-[#6bdcc0] text-[#051028] px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
              >
                📧 Email Us
              </a>
              <button
                onClick={handleRetry}
                className="block w-full bg-transparent border border-[#6bdcc0] text-[#6bdcc0] px-3 py-2 rounded-lg text-xs font-medium hover:bg-[#6bdcc0]/10 transition-colors"
              >
                🔄 Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Rocket.Chat when verified
  return (
    <div className={className}>
      {rocketChatLoaded && (
        <>
          {/* Rocket.Chat Livechat Script */}
          <Script
            id="rocketchat-livechat-protected"
            strategy="afterInteractive"
          >
            {`
              console.log("🚀 ProtectedChat: Loading Rocket.Chat script");
              (function(w, d, s, u) {
                w.RocketChat = function(c) { w.RocketChat._.push(c) }; 
                w.RocketChat._ = []; 
                w.RocketChat.url = u;
                var h = d.getElementsByTagName(s)[0], j = d.createElement(s);
                j.async = true; 
                j.src = 'https://chat.intellectif.com/livechat/rocketchat-livechat.min.js?_=201903270000';
                j.onload = function() {
                  console.log("✅ ProtectedChat: Rocket.Chat script loaded successfully");
                };
                j.onerror = function() {
                  console.error("❌ ProtectedChat: Failed to load Rocket.Chat script");
                };
                h.parentNode.insertBefore(j, h);
              })(window, document, 'script', 'https://chat.intellectif.com/livechat');
            `}
          </Script>
        </>
      )}
    </div>
  );
}

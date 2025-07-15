"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import {
  Turnstile as ReactTurnstile,
  type TurnstileInstance,
} from "@marsidev/react-turnstile";

export interface InvisibleTurnstileRef {
  reset: () => void;
  execute: () => void;
}

interface InvisibleTurnstileProps {
  onSuccess: (token: string) => void;
  onError: () => void;
  onExpire: () => void;
  className?: string;
  autoExecute?: boolean;
}

const InvisibleTurnstile = forwardRef<
  InvisibleTurnstileRef,
  InvisibleTurnstileProps
>(
  (
    { onSuccess, onError, onExpire, className = "", autoExecute = true },
    ref
  ) => {
    const turnstileRef = useRef<TurnstileInstance>(null);

    useImperativeHandle(ref, () => ({
      execute: () => {
        console.log("�� InvisibleTurnstile: Execute called");
        if (turnstileRef.current) {
          try {
            turnstileRef.current.execute();
            console.log(
              "✅ InvisibleTurnstile: Execute method called successfully"
            );
          } catch (error) {
            console.error("❌ InvisibleTurnstile: Execute failed", error);
            onError();
          }
        } else {
          console.error("❌ InvisibleTurnstile: Widget ref not available");
          onError();
        }
      },
      reset: () => {
        console.log("🔄 InvisibleTurnstile: Reset called");
        if (turnstileRef.current) {
          try {
            turnstileRef.current.reset();
            console.log(
              "✅ InvisibleTurnstile: Reset method called successfully"
            );
          } catch (error) {
            console.error("❌ InvisibleTurnstile: Reset failed", error);
          }
        } else {
          console.warn(
            "⚠️ InvisibleTurnstile: Widget ref not available for reset"
          );
        }
      },
    }));

    // Enhanced logging for chat protection
    const handleSuccess = (token: string) => {
      console.log("✅ InvisibleTurnstile: Challenge completed successfully", {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + "...",
        timestamp: new Date().toISOString(),
      });
      onSuccess(token);
    };

    const handleError = () => {
      console.error("❌ InvisibleTurnstile: Challenge failed", {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
      });
      onError();
    };

    const handleExpire = () => {
      console.warn("⏰ InvisibleTurnstile: Challenge expired", {
        timestamp: new Date().toISOString(),
        autoExecute,
      });
      onExpire();
    };

    // Don't render if site key is missing (fail gracefully)
    if (!process.env.NEXT_PUBLIC_TURNSTILE_CHAT_SITE_KEY) {
      console.error("❌ InvisibleTurnstile: Chat site key is not configured");
      console.error(
        "❌ InvisibleTurnstile: Please set NEXT_PUBLIC_TURNSTILE_CHAT_SITE_KEY in your environment"
      );

      // Call onError to trigger fallback in parent component
      setTimeout(() => onError(), 100);

      return (
        <div className="text-red-500 text-sm" style={{ display: "none" }}>
          Chat security widget not configured. Please contact support.
        </div>
      );
    }

    console.log("🔧 InvisibleTurnstile: Initializing with config", {
      siteKey:
        process.env.NEXT_PUBLIC_TURNSTILE_CHAT_SITE_KEY?.substring(0, 20) +
        "...",
      autoExecute,
      className,
    });

    // Monitor widget mounting and readiness
    useEffect(() => {
      console.log(
        "🔍 InvisibleTurnstile: Component mounted, checking widget state"
      );

      const checkWidget = () => {
        if (turnstileRef.current) {
          console.log("✅ InvisibleTurnstile: Widget ref is available");
          if (autoExecute) {
            console.log("🚀 InvisibleTurnstile: Auto-executing widget");
            try {
              turnstileRef.current.execute();
            } catch (error) {
              console.error(
                "❌ InvisibleTurnstile: Auto-execute failed",
                error
              );
              onError();
            }
          }
        } else {
          console.log("⏳ InvisibleTurnstile: Widget ref not yet available");
        }
      };

      // Check immediately and after a delay
      checkWidget();
      const timer = setTimeout(checkWidget, 1000);

      return () => clearTimeout(timer);
    }, [autoExecute, onError]);

    return (
      <div className={className} style={{ display: "none" }}>
        <ReactTurnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_CHAT_SITE_KEY}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          options={{
            theme: "light",
            size: "invisible",
            execution: autoExecute ? "execute" : "render",
          }}
        />
      </div>
    );
  }
);

InvisibleTurnstile.displayName = "InvisibleTurnstile";

export default InvisibleTurnstile;

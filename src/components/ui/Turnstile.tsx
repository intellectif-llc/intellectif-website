"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Turnstile as ReactTurnstile,
  type TurnstileInstance,
} from "@marsidev/react-turnstile";

export interface TurnstileRef {
  reset: () => void;
  getToken: () => string | null;
}

interface TurnstileProps {
  onSuccess?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onLoad?: () => void;
  className?: string;
}

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ onSuccess, onError, onExpire, onLoad, className = "" }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const currentToken = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (turnstileRef.current) {
          turnstileRef.current.reset();
          currentToken.current = null;
        }
      },
      getToken: () => currentToken.current,
    }));

    const handleSuccess = (token: string) => {
      currentToken.current = token;
      onSuccess?.(token);
    };

    const handleError = () => {
      currentToken.current = null;
      onError?.();
    };

    const handleExpire = () => {
      currentToken.current = null;
      onExpire?.();
    };

    // Don't render if site key is missing (fail gracefully)
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      return null;
    }

    return (
      <div className={className}>
        <ReactTurnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          onWidgetLoad={onLoad}
          options={{
            theme: "dark",
            size: "normal",
            retry: "auto",
            refreshExpired: "auto",
          }}
        />
      </div>
    );
  }
);

Turnstile.displayName = "Turnstile";

export default Turnstile;

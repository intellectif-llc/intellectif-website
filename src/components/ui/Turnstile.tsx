"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Turnstile as ReactTurnstile,
  type TurnstileInstance,
} from "@marsidev/react-turnstile";

export interface TurnstileRef {
  reset: () => void;
}

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError: () => void;
  onExpire: () => void;
  className?: string;
}

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ onSuccess, onError, onExpire, className = "" }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
      },
    }));

    // Don't render if site key is missing (fail gracefully)
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      console.error("Turnstile site key is not configured.");
      return (
        <div className="text-red-500 text-sm">
          Security widget cannot be displayed. Site is not configured correctly.
        </div>
      );
    }

    return (
      <div className={className}>
        <ReactTurnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={onSuccess}
          onError={onError}
          onExpire={onExpire}
          options={{
            theme: "dark",
            size: "normal",
          }}
        />
      </div>
    );
  }
);

Turnstile.displayName = "Turnstile";

export default Turnstile;

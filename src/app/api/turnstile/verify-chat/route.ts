import { NextRequest, NextResponse } from "next/server";

interface TurnstileChatResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

interface VerificationRequest {
  token: string;
  sessionId?: string;
  refreshAttempt?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("🚀 ChatVerification: API endpoint called", {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent")?.substring(0, 100),
      ip:
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    });

    const body: VerificationRequest = await request.json();
    const { token, sessionId, refreshAttempt = false } = body;

    // Validate request
    if (!token) {
      console.error("❌ ChatVerification: Missing token in request");
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    /*     console.log("📥 ChatVerification: Processing request", {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + "...",
      sessionId: sessionId || "none",
      refreshAttempt,
      isRefresh: refreshAttempt ? "🔄" : "🆕",
    }); */

    // Check environment configuration
    const secretKey = process.env.TURNSTILE_CHAT_SECRET_KEY;
    if (!secretKey) {
      console.error(
        "❌ ChatVerification: TURNSTILE_CHAT_SECRET_KEY not configured"
      );
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("🔧 ChatVerification: Environment check", {
      hasSecretKey: !!secretKey,
      secretKeyLength: secretKey.length,
      expectedLength: 34,
      configStatus:
        secretKey.length === 34 ? "✅ Valid" : "⚠️ Unexpected length",
    });

    // Get client information for verification
    const clientIP =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    /*     console.log("🌐 ChatVerification: Client details", {
      ip: clientIP,
      cfCountry: request.headers.get("cf-ipcountry") || "unknown",
      cfRay: request.headers.get("cf-ray") || "none",
    }); */

    // Prepare verification request
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", clientIP);

    // Add idempotency key for chat verification
    const idempotencyKey = `chat_${
      sessionId || "anon"
    }_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    formData.append("idempotency_key", idempotencyKey);

    console.log("📤 ChatVerification: Sending to Cloudflare", {
      endpoint: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      idempotencyKey,
      clientIP,
      requestStartTime: startTime,
    });

    // Validate with Cloudflare with extended timeout for chat
    const verificationStartTime = Date.now();
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(20000), // 20 second timeout for chat
      }
    );

    const verificationDuration = Date.now() - verificationStartTime;

    /* console.log("📡 ChatVerification: Cloudflare response received", {
      responseStatus: response.status,
      responseOk: response.ok,
      verificationDuration: verificationDuration + "ms",
      responseHeaders: {
        contentType: response.headers.get("content-type"),
        cfRay: response.headers.get("cf-ray"),
      },
    }); */

    const result: TurnstileChatResponse = await response.json();

    /*     console.log("📊 ChatVerification: Cloudflare result", {
      success: result.success,
      errorCodes: result["error-codes"] || [],
      challengeTimestamp: result.challenge_ts,
      hostname: result.hostname,
      action: result.action,
      hasCustomData: !!result.cdata,
    }); */

    if (!response.ok) {
      console.error("❌ ChatVerification: Cloudflare API error", {
        status: response.status,
        statusText: response.statusText,
        result,
        duration: verificationDuration + "ms",
      });
      return NextResponse.json(
        { success: false, error: "Verification service error" },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.warn("⚠️ ChatVerification: Verification failed", {
        errors: result["error-codes"],
        ip: clientIP,
        sessionId,
        refreshAttempt,
        tokenPreview: token.substring(0, 20) + "...",
        timestamp: new Date().toISOString(),
        duration: verificationDuration + "ms",
      });

      // Provide specific error feedback for chat context
      let errorMessage = "Chat verification failed";
      const errorCodes = result["error-codes"] || [];

      if (errorCodes.includes("timeout-or-duplicate")) {
        errorMessage = "Chat verification expired or already used";
      } else if (errorCodes.includes("invalid-input-secret")) {
        errorMessage = "Chat verification configuration error";
      } else if (errorCodes.includes("bad-request")) {
        errorMessage = "Invalid chat verification request";
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorCodes: result["error-codes"],
        canRetry: !errorCodes.includes("invalid-input-secret"),
      });
    }

    // Verification successful
    const totalDuration = Date.now() - startTime;

    console.log("✅ ChatVerification: Verification successful", {
      sessionId,
      refreshAttempt,
      challengeTimestamp: result.challenge_ts,
      hostname: result.hostname,
      clientIP,
      totalDuration: totalDuration + "ms",
      verificationDuration: verificationDuration + "ms",
      action: result.action || "chat_access",
    });

    // Return success with additional metadata for chat sessions
    return NextResponse.json({
      success: true,
      challengeTs: result.challenge_ts,
      hostname: result.hostname,
      action: result.action,
      sessionInfo: {
        verified: true,
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        refreshAttempt,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;

    console.error("💥 ChatVerification: Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + "ms",
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types for chat verification
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error("⏰ ChatVerification: Network timeout", {
        timeoutDuration: totalDuration + "ms",
        retryRecommended: true,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Chat verification service temporarily unavailable",
          canRetry: true,
          retryAfter: 5000, // Suggest retry after 5 seconds
        },
        { status: 503 }
      );
    }

    if (error instanceof Error && error.message.includes("AbortError")) {
      console.error("🚫 ChatVerification: Request aborted", {
        duration: totalDuration + "ms",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Chat verification request was cancelled",
          canRetry: true,
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Chat verification internal error",
        canRetry: true,
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  console.log("🔧 ChatVerification: OPTIONS request received");

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

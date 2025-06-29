import { NextRequest, NextResponse } from "next/server";

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // Temporary logging for production diagnosis
    console.log("Turnstile Verify API Route Triggered.");
    console.log("Has Secret Key:", !!secretKey);
    if (secretKey) {
      console.log(
        "Secret Key Length:",
        secretKey.length,
        `(should be 34 characters)`
      );
    } else {
      console.error("TURNSTILE_SECRET_KEY environment variable is NOT set.");
    }

    // Development bypass - remove in production
    if (
      process.env.NODE_ENV === "development" &&
      process.env.BYPASS_TURNSTILE === "true"
    ) {
      console.log("BYPASSING Turnstile verification in development");
      return NextResponse.json({
        success: true,
        challengeTs: new Date().toISOString(),
        hostname: "localhost",
        bypass: true,
      });
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.error("TURNSTILE_SECRET_KEY is not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get the client's IP address
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      request.headers.get("X-Real-IP") ||
      "unknown";

    // Prepare the validation request
    const formData = new FormData();
    formData.append("secret", process.env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    formData.append("remoteip", ip);

    // Add idempotency key to prevent token reuse
    const idempotencyKey = crypto.randomUUID();
    formData.append("idempotency_key", idempotencyKey);

    // Validate with Cloudflare with timeout and retry
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }
    );

    const result: TurnstileResponse = await response.json();

    console.log("Cloudflare Verification Outcome:", result);

    if (!response.ok) {
      console.error("Turnstile API error:", result);
      return NextResponse.json(
        { success: false, error: "Verification service error" },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.warn("Turnstile verification failed:", {
        errors: result["error-codes"],
        ip,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: false,
        error: "Verification failed",
        errorCodes: result["error-codes"],
      });
    }

    // Verification successful
    return NextResponse.json({
      success: true,
      challengeTs: result.challenge_ts,
      hostname: result.hostname,
    });
  } catch (error) {
    console.error("Turnstile verification error:", error);

    // Handle network timeout specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error("Network timeout connecting to Cloudflare Turnstile");
      return NextResponse.json(
        {
          success: false,
          error: "Verification service temporarily unavailable",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

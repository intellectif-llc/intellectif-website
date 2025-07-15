import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = {
  maxRequests: 10, // Max requests per window
  windowMs: 60 * 1000, // 1 minute window
  blockDurationMs: 5 * 60 * 1000, // 5 minute block for violations
};

// Session validation function
async function validateChatSession(sessionToken?: string): Promise<boolean> {
  if (!sessionToken) {
    console.warn("⚠️ ChatBridge: No session token provided");
    return false;
  }

  try {
    console.log("🔐 ChatBridge: Validating session token", {
      tokenLength: sessionToken.length,
      tokenPreview: sessionToken.substring(0, 20) + "...",
    });

    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/api/turnstile/verify-chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          sessionId: "chat_bridge_validation",
          refreshAttempt: false,
        }),
      }
    );

    const result = await response.json();

    console.log("📊 ChatBridge: Session validation result", {
      success: result.success,
      error: result.error,
      canRetry: result.canRetry,
    });

    return result.success;
  } catch (error) {
    console.error("❌ ChatBridge: Session validation error", error);
    return false;
  }
}

// Rate limiting function
function checkRateLimit(identifier: string): {
  allowed: boolean;
  resetTime?: number;
} {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new rate limit window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    console.log("✅ ChatBridge: Rate limit reset for", identifier);
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    console.warn("⚠️ ChatBridge: Rate limit exceeded", {
      identifier,
      count: userLimit.count,
      maxRequests: RATE_LIMIT.maxRequests,
      resetTime: new Date(userLimit.resetTime).toISOString(),
    });

    // Extend block time for repeated violations
    userLimit.resetTime = now + RATE_LIMIT.blockDurationMs;
    return { allowed: false, resetTime: userLimit.resetTime };
  }

  userLimit.count += 1;
  console.log("📊 ChatBridge: Rate limit check", {
    identifier,
    count: userLimit.count,
    maxRequests: RATE_LIMIT.maxRequests,
    remaining: RATE_LIMIT.maxRequests - userLimit.count,
  });

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("🚀 ChatBridge: Request received", {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent")?.substring(0, 100),
      ip:
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    });

    // Get the message details from the request body
    const { message, userId, roomId, sessionId, sessionToken } =
      await request.json();

    console.log("📥 ChatBridge: Processing request", {
      hasMessage: !!message,
      messageLength: message?.length || 0,
      userId: userId || "none",
      roomId: roomId || "none",
      hasSessionToken: !!sessionToken,
      sessionTokenLength: sessionToken?.length || 0,
    });

    if (!message || !userId || !roomId) {
      console.error("❌ ChatBridge: Missing required fields");
      return NextResponse.json(
        { success: false, error: "message, userId, and roomId are required" },
        { status: 400 }
      );
    }

    // Validate session token (for bot protection)
    const isValidSession = await validateChatSession(sessionToken);
    if (!isValidSession) {
      console.warn("⚠️ ChatBridge: Invalid or missing session token", {
        userId,
        roomId,
        hasToken: !!sessionToken,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Chat session not verified. Please refresh the page.",
          errorCode: "SESSION_INVALID",
        },
        { status: 403 }
      );
    }

    // Check rate limiting
    const clientId = `${userId}_${
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown"
    }`;
    const rateLimit = checkRateLimit(clientId);

    if (!rateLimit.allowed) {
      console.warn("⚠️ ChatBridge: Rate limit exceeded", {
        clientId,
        resetTime: rateLimit.resetTime
          ? new Date(rateLimit.resetTime).toISOString()
          : "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Too many messages. Please wait before sending another message.",
          errorCode: "RATE_LIMITED",
          retryAfter: rateLimit.resetTime
            ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            : 300,
        },
        { status: 429 }
      );
    }

    // Use userId as sessionId if not provided
    const dialogflowSessionId = sessionId || userId;

    console.log("🤖 ChatBridge: Processing Dialogflow request", {
      messageLength: message.length,
      dialogflowSessionId,
      userId,
      roomId,
    });

    // Step 1: Send message to Dialogflow CX
    const dialogflowStartTime = Date.now();
    const dialogflowResponse = await sendToDialogflow(
      message,
      dialogflowSessionId
    );
    const dialogflowDuration = Date.now() - dialogflowStartTime;

    console.log("📊 ChatBridge: Dialogflow response", {
      success: dialogflowResponse.success,
      duration: dialogflowDuration + "ms",
      hasResponse: !!dialogflowResponse.response,
      responseLength: dialogflowResponse.response?.length || 0,
      intent: dialogflowResponse.intent,
      confidence: dialogflowResponse.confidence,
    });

    if (!dialogflowResponse.success) {
      console.error("❌ ChatBridge: Dialogflow processing failed");
      return NextResponse.json(
        { success: false, error: "Failed to get response from Dialogflow" },
        { status: 500 }
      );
    }

    // Step 2: Send Dialogflow response back to Rocket.Chat
    const rocketChatStartTime = Date.now();
    const responseText =
      dialogflowResponse.response ||
      "I'm having trouble processing your request right now.";

    console.log("🚀 ChatBridge: Sending to Rocket.Chat", {
      roomId,
      responseLength: responseText.length,
      responsePreview:
        responseText.substring(0, 100) +
        (responseText.length > 100 ? "..." : ""),
    });

    const rocketChatResponse = await sendToRocketChat(
      roomId,
      responseText,
      "Intellectif Bot"
    );
    const rocketChatDuration = Date.now() - rocketChatStartTime;

    console.log("📊 ChatBridge: Rocket.Chat response", {
      success: rocketChatResponse.success,
      duration: rocketChatDuration + "ms",
      messageId: rocketChatResponse.messageId,
      timestamp: rocketChatResponse.timestamp,
    });

    if (!rocketChatResponse.success) {
      console.error("❌ ChatBridge: Rocket.Chat sending failed");
      return NextResponse.json(
        { success: false, error: "Failed to send response to Rocket.Chat" },
        { status: 500 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log("✅ ChatBridge: Request completed successfully", {
      totalDuration: totalDuration + "ms",
      dialogflowDuration: dialogflowDuration + "ms",
      rocketChatDuration: rocketChatDuration + "ms",
      userId,
      roomId,
      messageId: rocketChatResponse.messageId,
    });

    return NextResponse.json({
      success: true,
      dialogflowResponse: dialogflowResponse.response,
      intent: dialogflowResponse.intent,
      confidence: dialogflowResponse.confidence,
      rocketChatMessageId: rocketChatResponse.messageId,
      processingInfo: {
        totalDuration,
        dialogflowDuration,
        rocketChatDuration,
        protected: true, // Indicates this request was protected by Turnstile
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("💥 ChatBridge: Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + "ms",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process chat bridge request",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

async function sendToDialogflow(message: string, sessionId: string) {
  try {
    // Get environment variables
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
    const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Dialogflow credentials");
    }

    // Create credentials object
    const credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };

    // Get location and construct the correct API endpoint
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const apiEndpoint =
      location === "global"
        ? "dialogflow.googleapis.com"
        : `${location}-dialogflow.googleapis.com`;

    // Create Dialogflow CX client with correct regional endpoint
    const client = new SessionsClient({
      credentials,
      projectId,
      apiEndpoint,
    });

    // Construct the session path
    const agentId = process.env.DIALOGFLOW_AGENT_ID || "default-agent";
    const sessionPath = client.projectLocationAgentSessionPath(
      projectId,
      location,
      agentId,
      sessionId
    );

    // Create the request
    const detectIntentRequest = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
        },
        languageCode: "en-US",
      },
    };

    // Send the request to Dialogflow CX
    const [response] = await client.detectIntent(detectIntentRequest);

    // Extract the response text
    const responseText =
      response.queryResult?.responseMessages
        ?.map((msg: any) => msg.text?.text?.[0])
        .filter(Boolean)
        .join(" ") || "I didn't understand that. Can you please rephrase?";

    return {
      success: true,
      response: responseText,
      intent: response.queryResult?.intent?.displayName,
      confidence: response.queryResult?.intentDetectionConfidence,
    };
  } catch (error) {
    console.error("Error communicating with Dialogflow:", error);
    return {
      success: false,
      error: "Failed to communicate with Dialogflow",
    };
  }
}

async function sendToRocketChat(
  roomId: string,
  message: string,
  alias: string
) {
  try {
    // Get Rocket.Chat credentials
    const authToken = process.env.ROCKETCHAT_AUTH_TOKEN;
    const userId = process.env.ROCKETCHAT_USER_ID;

    if (!authToken || !userId) {
      throw new Error("Missing Rocket.Chat credentials");
    }

    // Send message to Rocket.Chat
    const response = await fetch(
      "https://chat.intellectif.com/api/v1/chat.postMessage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": authToken,
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          roomId,
          text: message,
          alias,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Rocket.Chat API error:", errorText);
      throw new Error(`Rocket.Chat API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.message?._id,
      timestamp: data.message?.ts,
    };
  } catch (error) {
    console.error("Error sending message to Rocket.Chat:", error);
    return {
      success: false,
      error: "Failed to send message to Rocket.Chat",
    };
  }
}

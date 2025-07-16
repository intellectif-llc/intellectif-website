import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

// Interface for RocketChat webhook payload structure
interface RocketChatMessage {
  u: {
    _id: string;
    username: string;
    name: string;
  };
  _id: string;
  username: string;
  msg: string;
  ts: string;
  rid: string;
  _updatedAt: string;
}

interface RocketChatVisitor {
  _id: string;
  token: string;
  name: string;
  username: string;
  department?: string;
  email?: Array<{ address: string }>;
}

interface RocketChatAgent {
  _id: string;
  username: string;
  name: string;
  email: string;
}

interface RocketChatWebhookPayload {
  _id: string; // Room/conversation ID
  label: string;
  createdAt: string;
  lastMessageAt: string;
  visitor: RocketChatVisitor;
  agent?: RocketChatAgent;
  crmData?: string;
  type: string;
  messages: RocketChatMessage[];
}

// Configuration flags - Control the integration behavior
const ENABLE_DIALOGFLOW_BRIDGE =
  process.env.ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE === "true";
const ENABLE_AUTO_RESPONSE =
  process.env.ENABLE_ROCKETCHAT_AUTO_RESPONSE === "true";

// Bot configuration - Filter out bot messages to prevent loops
const BOT_USERNAMES = [
  "dialogflow.bot",
  "intellectif.bot",
  "virtual-assistant",
  // Add more bot usernames as needed
];

// Message deduplication - Track processed messages to prevent duplicates
const processedMessages = new Map<string, number>();
const MESSAGE_CACHE_TTL = 300000; // 5 minutes in milliseconds
const PROCESSING_COOLDOWN = 2000; // 2 seconds between same user messages

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_CACHE_TTL) {
      processedMessages.delete(messageId);
    }
  }
}, 60000); // Cleanup every minute

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("🚀 RocketChat → Dialogflow CX Bridge: Request received", {
      timestamp: new Date().toISOString(),
      bridgeEnabled: ENABLE_DIALOGFLOW_BRIDGE,
      autoResponseEnabled: ENABLE_AUTO_RESPONSE,
      userAgent: request.headers.get("user-agent")?.substring(0, 100),
      ip:
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    });

    // Parse the RocketChat webhook payload
    const payload: RocketChatWebhookPayload = await request.json();

    console.log("📥 RocketChat Bridge: Payload received", {
      conversationId: payload._id,
      type: payload.type,
      messageCount: payload.messages?.length || 0,
      hasAgent: !!payload.agent,
      visitorName: payload.visitor?.name,
      agentUsername: payload.agent?.username,
    });

    // Validate payload structure
    if (!payload._id || !payload.messages || !Array.isArray(payload.messages)) {
      console.error("❌ RocketChat Bridge: Invalid payload structure");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid RocketChat webhook payload structure",
        },
        { status: 400 }
      );
    }

    // Process the latest message (usually the one that triggered the webhook)
    const latestMessage = payload.messages[payload.messages.length - 1];

    if (!latestMessage) {
      console.warn("⚠️ RocketChat Bridge: No messages in payload");
      return NextResponse.json({
        success: true,
        message: "No messages to process",
      });
    }

    console.log("💬 RocketChat Bridge: Processing latest message", {
      messageId: latestMessage._id,
      messageText: latestMessage.msg,
      senderId: latestMessage.u._id,
      senderName: latestMessage.u.name,
      senderUsername: latestMessage.u.username,
      roomId: latestMessage.rid,
      timestamp: latestMessage.ts,
    });

    // CRITICAL: Message deduplication - Prevent duplicate processing
    const messageKey = `${latestMessage._id}_${latestMessage.u._id}`;
    const now = Date.now();
    const lastProcessed = processedMessages.get(messageKey);

    if (lastProcessed && now - lastProcessed < PROCESSING_COOLDOWN) {
      console.log(
        "🔄 RocketChat Bridge: Duplicate message detected, skipping",
        {
          messageId: latestMessage._id,
          lastProcessed: new Date(lastProcessed).toISOString(),
          cooldownRemaining: PROCESSING_COOLDOWN - (now - lastProcessed) + "ms",
        }
      );

      return NextResponse.json({
        success: true,
        message: "Duplicate message skipped",
        skipped: true,
        reason: "deduplication",
      });
    }

    // Mark message as being processed
    processedMessages.set(messageKey, now);

    // Enhanced bot detection - Skip messages from bots/agents to avoid loops
    const isAgentMessage =
      payload.agent && latestMessage.u._id === payload.agent._id;
    const isBotMessage = BOT_USERNAMES.includes(latestMessage.u.username);
    const isVirtualAssistant =
      latestMessage.u.name?.toLowerCase().includes("virtual assistant") ||
      latestMessage.u.name?.toLowerCase().includes("intellectif bot");

    if (isAgentMessage || isBotMessage || isVirtualAssistant) {
      console.log(
        "🤖 RocketChat Bridge: Skipping bot/agent message to avoid loops",
        {
          isAgentMessage,
          isBotMessage,
          isVirtualAssistant,
          agentId: payload.agent?._id,
          agentUsername: payload.agent?.username,
          messageUsername: latestMessage.u.username,
          messageName: latestMessage.u.name,
        }
      );

      return NextResponse.json({
        success: true,
        message: "Bot/agent message skipped to avoid loops",
        skipped: true,
        reason: "bot_detection",
      });
    }

    // Check if this is a visitor message that should trigger a response
    const shouldProcessMessage =
      payload.type === "Message" &&
      latestMessage.u._id === payload.visitor._id &&
      latestMessage.msg?.trim().length > 0;

    if (!shouldProcessMessage) {
      console.log("ℹ️ RocketChat Bridge: Message does not require processing", {
        type: payload.type,
        isVisitorMessage: latestMessage.u._id === payload.visitor._id,
        hasContent: !!latestMessage.msg?.trim(),
      });

      return NextResponse.json({
        success: true,
        message: "Message processed but no response required",
        processed: false,
      });
    }

    // Extract essential information for processing
    const extractedData = {
      message: latestMessage.msg.trim(),
      userId: latestMessage.u._id,
      roomId: latestMessage.rid,
      sessionId: payload.visitor.token || latestMessage.u._id,
      userName: latestMessage.u.name,
      userEmail: payload.visitor.email?.[0]?.address,
      conversationLabel: payload.label,
      visitorToken: payload.visitor.token,
    };

    console.log("📊 RocketChat Bridge: Extracted data for processing", {
      messageLength: extractedData.message.length,
      sessionId: extractedData.sessionId,
      roomId: extractedData.roomId,
      userId: extractedData.userId,
      hasEmail: !!extractedData.userEmail,
    });

    // INDUSTRY STANDARD: Respond immediately to webhook to prevent UI delays
    // Process AI response asynchronously
    const webhookResponseTime = Date.now() - startTime;
    console.log("⚡ RocketChat Bridge: Sending immediate webhook response", {
      responseTime: webhookResponseTime + "ms",
      strategy: "Asynchronous processing",
    });

    // Start background processing without waiting
    if (ENABLE_DIALOGFLOW_BRIDGE && ENABLE_AUTO_RESPONSE) {
      // Don't await - let it run in background
      processDialogflowResponse(extractedData).catch((error: unknown) => {
        console.error("💥 Background processing error:", error);
      });
    }

    // Return immediate response to RocketChat
    return NextResponse.json({
      success: true,
      message: "RocketChat webhook received and processing",
      data: {
        conversationId: payload._id,
        messageProcessed: extractedData.message,
        userId: extractedData.userId,
        roomId: extractedData.roomId,
        sessionId: extractedData.sessionId,
        webhookResponseTime: webhookResponseTime,
        backgroundProcessing: ENABLE_DIALOGFLOW_BRIDGE && ENABLE_AUTO_RESPONSE,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("💥 RocketChat Bridge: Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + "ms",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process RocketChat webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Enhanced Dialogflow CX function with better session management
async function sendToDialogflowCX(
  message: string,
  sessionId: string,
  userEmail?: string,
  userName?: string
) {
  try {
    // Get environment variables
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
    const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const agentId = process.env.DIALOGFLOW_AGENT_ID;

    if (!projectId || !clientEmail || !privateKey || !agentId) {
      throw new Error(
        "Missing Dialogflow CX credentials - check environment variables"
      );
    }

    console.log("🔧 Dialogflow CX: Configuration", {
      projectId,
      location,
      agentId,
      sessionId,
      hasUserEmail: !!userEmail,
      hasUserName: !!userName,
    });

    // Create credentials object
    const credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };

    // Get API endpoint for the region
    const apiEndpoint =
      location === "global"
        ? "dialogflow.googleapis.com"
        : `${location}-dialogflow.googleapis.com`;

    // Create Dialogflow CX client
    const client = new SessionsClient({
      credentials,
      projectId,
      apiEndpoint,
    });

    // Construct the session path for CX
    const sessionPath = client.projectLocationAgentSessionPath(
      projectId,
      location,
      agentId,
      sessionId
    );

    // Enhanced request with user context
    const detectIntentRequest: any = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
        },
        languageCode: "en-US",
      },
    };

    // Add user information if available (for personalization)
    if (userEmail || userName) {
      detectIntentRequest.queryParams = {
        parameters: {
          userEmail: userEmail || "",
          userName: userName || "",
        },
      };
    }

    console.log("📤 Dialogflow CX: Sending request", {
      sessionPath,
      messageLength: message.length,
      hasParameters: !!detectIntentRequest.queryParams,
    });

    // Send the request to Dialogflow CX
    const [response] = await client.detectIntent(detectIntentRequest);

    // Extract the response text
    const responseText =
      response.queryResult?.responseMessages
        ?.map((msg: any) => msg.text?.text?.[0])
        .filter(Boolean)
        .join(" ") || "I didn't understand that. Can you please rephrase?";

    console.log("📨 Dialogflow CX: Response received", {
      intent: response.queryResult?.intent?.displayName,
      confidence: response.queryResult?.intentDetectionConfidence,
      responseLength: responseText.length,
    });

    return {
      success: true,
      response: responseText,
      intent: response.queryResult?.intent?.displayName,
      confidence: response.queryResult?.intentDetectionConfidence,
    };
  } catch (error) {
    console.error("❌ Dialogflow CX: Communication error", error);
    return {
      success: false,
      error: "Failed to communicate with Dialogflow CX",
    };
  }
}

// Background processing function for Dialogflow response
async function processDialogflowResponse(extractedData: {
  message: string;
  userId: string;
  roomId: string;
  sessionId: string;
  userName: string;
  userEmail?: string;
  conversationLabel: string;
  visitorToken: string;
}) {
  const processingStartTime = Date.now();

  try {
    console.log("🤖 Background: Starting Dialogflow CX processing", {
      sessionId: extractedData.sessionId,
      messageLength: extractedData.message.length,
    });

    // Send typing indicator
    const typingResult = await sendTypingIndicator(extractedData.roomId, true);
    console.log("💭 Background: Typing indicator sent", {
      success: typingResult.success,
    });

    // Process with Dialogflow CX
    const dialogflowStartTime = Date.now();
    const dialogflowResponse = await sendToDialogflowCX(
      extractedData.message,
      extractedData.sessionId,
      extractedData.userEmail,
      extractedData.userName
    );
    const dialogflowDuration = Date.now() - dialogflowStartTime;

    console.log("📊 Background: Dialogflow CX response", {
      success: dialogflowResponse.success,
      duration: dialogflowDuration + "ms",
      hasResponse: !!dialogflowResponse.response,
      responseLength: dialogflowResponse.response?.length || 0,
      intent: dialogflowResponse.intent,
      confidence: dialogflowResponse.confidence,
    });

    // Stop typing indicator
    await sendTypingIndicator(extractedData.roomId, false);

    // Send response if successful
    if (dialogflowResponse.success && dialogflowResponse.response) {
      const rocketChatStartTime = Date.now();
      const rocketChatResponse = await sendToRocketChat(
        extractedData.roomId,
        dialogflowResponse.response,
        "Virtual Assistant"
      );
      const rocketChatDuration = Date.now() - rocketChatStartTime;

      console.log("📊 Background: RocketChat response", {
        success: rocketChatResponse.success,
        duration: rocketChatDuration + "ms",
        messageId: rocketChatResponse.messageId,
      });

      const totalDuration = Date.now() - processingStartTime;
      console.log("✅ Background: Processing complete", {
        totalDuration: totalDuration + "ms",
        dialogflowDuration: dialogflowDuration + "ms",
        rocketChatDuration: rocketChatDuration + "ms",
        naturalFlow: "No artificial delays",
      });

      return {
        success: true,
        dialogflowResponse,
        rocketChatResponse,
        totalDuration,
      };
    } else {
      console.warn("⚠️ Background: No valid response from Dialogflow CX");
      return {
        success: false,
        error: "No valid response from Dialogflow CX",
      };
    }
  } catch (error) {
    const totalDuration = Date.now() - processingStartTime;
    console.error("💥 Background: Processing error", {
      error: error instanceof Error ? error.message : "Unknown error",
      duration: totalDuration + "ms",
    });

    // Stop typing indicator on error
    await sendTypingIndicator(extractedData.roomId, false);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: totalDuration,
    };
  }
}

// Send typing indicator to RocketChat
async function sendTypingIndicator(roomId: string, isTyping: boolean) {
  try {
    const authToken = process.env.ROCKETCHAT_AUTH_TOKEN;
    const userId = process.env.ROCKETCHAT_USER_ID;

    if (!authToken || !userId) {
      throw new Error("Missing Rocket.Chat credentials");
    }

    console.log(
      `💭 RocketChat: ${isTyping ? "Starting" : "Stopping"} typing indicator`,
      {
        roomId,
        isTyping,
      }
    );

    const response = await fetch(
      `https://chat.intellectif.com/api/v1/rooms.${
        isTyping ? "startTyping" : "stopTyping"
      }`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": authToken,
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          roomId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ RocketChat: Typing indicator error", errorText);
      return { success: false, error: errorText };
    }

    console.log(
      `✅ RocketChat: Typing indicator ${isTyping ? "started" : "stopped"}`
    );
    return { success: true };
  } catch (error) {
    console.error("❌ RocketChat: Typing indicator error", error);
    return { success: false, error: "Failed to send typing indicator" };
  }
}

// Send message to RocketChat
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

    console.log("📤 RocketChat: Sending message", {
      roomId,
      messageLength: message.length,
      alias,
    });

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
      console.error("❌ RocketChat: API error", errorText);
      throw new Error(`RocketChat API error: ${response.status}`);
    }

    const data = await response.json();

    console.log("✅ RocketChat: Message sent successfully", {
      messageId: data.message?._id,
      timestamp: data.message?.ts,
    });

    return {
      success: true,
      messageId: data.message?._id,
      timestamp: data.message?.ts,
    };
  } catch (error) {
    console.error("❌ RocketChat: Send error", error);
    return {
      success: false,
      error: "Failed to send message to Rocket.Chat",
    };
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

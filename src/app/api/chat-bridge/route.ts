import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

export async function POST(request: NextRequest) {
  try {
    // Get the message details from the request body
    const { message, userId, roomId, sessionId } = await request.json();

    if (!message || !userId || !roomId) {
      return NextResponse.json(
        { success: false, error: "message, userId, and roomId are required" },
        { status: 400 }
      );
    }

    // Use userId as sessionId if not provided
    const dialogflowSessionId = sessionId || userId;

    // Step 1: Send message to Dialogflow CX
    const dialogflowResponse = await sendToDialogflow(
      message,
      dialogflowSessionId
    );

    if (!dialogflowResponse.success) {
      return NextResponse.json(
        { success: false, error: "Failed to get response from Dialogflow" },
        { status: 500 }
      );
    }

    // Step 2: Send Dialogflow response back to Rocket.Chat
    const rocketChatResponse = await sendToRocketChat(
      roomId,
      dialogflowResponse.response ||
        "I'm having trouble processing your request right now.",
      "Intellectif Bot"
    );

    if (!rocketChatResponse.success) {
      return NextResponse.json(
        { success: false, error: "Failed to send response to Rocket.Chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      dialogflowResponse: dialogflowResponse.response,
      intent: dialogflowResponse.intent,
      confidence: dialogflowResponse.confidence,
      rocketChatMessageId: rocketChatResponse.messageId,
    });
  } catch (error) {
    console.error("Error in chat bridge:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process chat bridge request" },
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

import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

export async function POST(request: NextRequest) {
  try {
    // Get the message from the request body
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { success: false, error: "Message and sessionId are required" },
        { status: 400 }
      );
    }

    // Get environment variables
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
    const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing Dialogflow credentials in environment variables");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create credentials object
    const credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"), // Handle escaped newlines
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
    // Format: projects/PROJECT_ID/locations/LOCATION/agents/AGENT_ID/sessions/SESSION_ID
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
        .join(" ") || "No response from Dialogflow";

    return NextResponse.json({
      success: true,
      response: responseText,
      intent: response.queryResult?.intent?.displayName,
      confidence: response.queryResult?.intentDetectionConfidence,
      sessionId,
    });
  } catch (error) {
    console.error("Error communicating with Dialogflow:", error);
    return NextResponse.json(
      { success: false, error: "Failed to communicate with Dialogflow" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

export async function GET(request: NextRequest) {
  try {
    // Test message
    const testMessage = "I need a web app";
    const testSessionId = "test-session-" + Date.now();

    console.log("Testing Dialogflow with message:", testMessage);
    console.log("Session ID:", testSessionId);

    // Get environment variables
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
    const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;
    const agentId = process.env.DIALOGFLOW_AGENT_ID;

    console.log("Environment variables check:", {
      projectId: projectId ? "✓ Set" : "✗ Missing",
      clientEmail: clientEmail ? "✓ Set" : "✗ Missing",
      privateKey: privateKey ? "✓ Set" : "✗ Missing",
      agentId: agentId ? "✓ Set" : "✗ Missing (will use default)"
    });

    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required Dialogflow credentials",
          details: {
            projectId: !!projectId,
            clientEmail: !!clientEmail,
            privateKey: !!privateKey,
            agentId: !!agentId,
          },
        },
        { status: 500 }
      );
    }

    // Create credentials object
    const credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };

    console.log("Creating Dialogflow CX client...", {
      client_email_preview: `${clientEmail.substring(0, 5)}...${clientEmail.slice(-10)}`,
      private_key: "[REDACTED]",
      project_id_preview: `${projectId.substring(0, 5)}...${projectId.slice(-4)}`
    });

    // Get location and construct the correct API endpoint
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const apiEndpoint =
      location === "global"
        ? "dialogflow.googleapis.com"
        : `${location}-dialogflow.googleapis.com`;

    console.log(`Using API endpoint: ${apiEndpoint} for location: ${location}`);

    // Create Dialogflow CX client with correct regional endpoint
    const client = new SessionsClient({
      credentials,
      projectId,
      apiEndpoint,
    });

    // Construct the session path
    const finalAgentId = agentId || "default-agent";
    const sessionPath = client.projectLocationAgentSessionPath(
      projectId,
      location,
      finalAgentId,
      testSessionId
    );

    console.log("Session path:", sessionPath.replace(projectId, "[PROJECT_ID]").replace(finalAgentId, "[AGENT_ID]"));

    // Create the request
    const detectIntentRequest = {
      session: sessionPath,
      queryInput: {
        text: {
          text: testMessage,
        },
        languageCode: "en-US",
      },
    };

    console.log("Sending request to Dialogflow CX...");

    // Send the request to Dialogflow CX
    const [response] = await client.detectIntent(detectIntentRequest);

    // Log sanitized response without sensitive data
    const sanitizedResponse = { 
      hasResponse: !!response,
      hasQueryResult: !!response.queryResult,
      intent: response.queryResult?.intent?.displayName,
      confidence: response.queryResult?.intentDetectionConfidence,
      responseMessagesCount: response.queryResult?.responseMessages?.length || 0
    };
    console.log("Dialogflow response summary:", sanitizedResponse);

    // Extract the response text
    const responseText =
      response.queryResult?.responseMessages
        ?.map((msg: any) => msg.text?.text?.[0])
        .filter(Boolean)
        .join(" ") || "No response from Dialogflow";

    const result = {
      success: true,
      testMessage,
      sessionId: testSessionId,
      response: responseText,
      intent: response.queryResult?.intent?.displayName,
      confidence: response.queryResult?.intentDetectionConfidence,
      rawResponse: response.queryResult,
    };

    console.log("Processed response:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing Dialogflow:", {
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? "[STACK TRACE AVAILABLE]" : "[NO STACK TRACE]"
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test Dialogflow integration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

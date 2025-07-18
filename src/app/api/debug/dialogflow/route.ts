import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const testStartTime = Date.now();

  console.log("🤖 Dialogflow Test: Starting connectivity test", {
    timestamp,
    requestFrom: request.headers.get("user-agent")?.substring(0, 100),
  });

  try {
    // Get environment variables
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
    const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const agentId = process.env.DIALOGFLOW_AGENT_ID;

    console.log("🔧 Dialogflow Test: Environment check", {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      hasAgentId: !!agentId,
      location,
      projectIdPreview: projectId ? `...${projectId.slice(-4)}` : undefined,
      clientEmailPreview: clientEmail
        ? `...${clientEmail.slice(-10)}`
        : undefined,
      privateKeyLength: privateKey ? "[REDACTED]" : undefined,
      privateKeyPreview: privateKey?.includes("-----BEGIN PRIVATE KEY-----")
        ? "[REDACTED PEM KEY]"
        : "Invalid format",
      agentIdPreview: agentId ? `...${agentId.slice(-4)}` : undefined,
    });

    // Check for missing credentials
    if (!projectId || !clientEmail || !privateKey || !agentId) {
      const missing = [
        !projectId && "DIALOGFLOW_PROJECT_ID",
        !clientEmail && "DIALOGFLOW_CLIENT_EMAIL",
        !privateKey && "DIALOGFLOW_PRIVATE_KEY",
        !agentId && "DIALOGFLOW_AGENT_ID",
      ].filter(Boolean);

      console.error("❌ Dialogflow Test: Missing required credentials", {
        missing,
        duration: Date.now() - testStartTime + "ms",
      });

      return NextResponse.json({
        success: false,
        error: "Missing Dialogflow CX credentials",
        missing,
        checks: {
          projectId: !!projectId,
          clientEmail: !!clientEmail,
          privateKey: !!privateKey,
          agentId: !!agentId,
          location: !!location,
        },
      });
    }

    // Test credential format
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      console.error("❌ Dialogflow Test: Invalid private key format", {
        privateKeyLength: privateKey.length,
        privateKeyPreview: "Invalid format - missing PEM headers",
        duration: Date.now() - testStartTime + "ms",
      });

      return NextResponse.json({
        success: false,
        error: "Invalid private key format",
        details:
          "Private key should include PEM headers (-----BEGIN PRIVATE KEY-----)",
        privateKeyLength: privateKey.length,
        privateKeyPreview: "Invalid format - missing PEM headers",
      });
    }

    console.log("🔑 Dialogflow Test: Creating credentials", {
      projectId: `...${projectId.slice(-4)}`,
      clientEmail: `...${clientEmail.slice(-10)}`,
      location,
      agentId: `...${agentId.slice(-4)}`,
      privateKeyValid: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      privateKey: "[REDACTED]"
    });

    // Create credentials object
    const credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
    
    // Log sanitized credentials
    console.log("🔐 Dialogflow Test: Credentials prepared", {
      client_email: `${clientEmail.substring(0, 5)}...${clientEmail.slice(-10)}`,
      private_key: "[REDACTED]"
    });

    // Get API endpoint for the region
    const apiEndpoint =
      location === "global"
        ? "dialogflow.googleapis.com"
        : `${location}-dialogflow.googleapis.com`;

    console.log("🌐 Dialogflow Test: API endpoint", {
      location,
      apiEndpoint,
      expectedEndpoint: apiEndpoint,
    });

    // Create Dialogflow CX client
    const clientCreationStart = Date.now();
    let client: SessionsClient;

    try {
      client = new SessionsClient({
        credentials,
        projectId,
        apiEndpoint,
      });

      console.log("✅ Dialogflow Test: Client created successfully", {
        duration: Date.now() - clientCreationStart + "ms",
      });
    } catch (clientError) {
      console.error("❌ Dialogflow Test: Client creation failed", {
        error:
          clientError instanceof Error ? clientError.message : "Unknown error",
        stack: clientError instanceof Error ? clientError.stack : undefined,
        duration: Date.now() - clientCreationStart + "ms",
      });

      return NextResponse.json({
        success: false,
        error: "Failed to create Dialogflow CX client",
        details:
          clientError instanceof Error ? clientError.message : "Unknown error",
        credentials: {
          hasEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
          privateKeyFormat: privateKey.includes("-----BEGIN PRIVATE KEY-----")
            ? "Valid PEM"
            : "Invalid format",
          privateKey: "[REDACTED]"
        },
      });
    }

    // Test session path creation
    const sessionPathStart = Date.now();
    let sessionPath: string;

    try {
      const testSessionId = `test-session-${Date.now()}`;
      sessionPath = client.projectLocationAgentSessionPath(
        projectId,
        location,
        agentId,
        testSessionId
      );

      console.log("✅ Dialogflow Test: Session path created", {
        sessionPath: `...${sessionPath.slice(-20)}`,
        testSessionId: `...${testSessionId.slice(-4)}`,
        duration: Date.now() - sessionPathStart + "ms",
      });
    } catch (pathError) {
      console.error("❌ Dialogflow Test: Session path creation failed", {
        error: pathError instanceof Error ? pathError.message : "Unknown error",
        projectId: `...${projectId.slice(-4)}`,
        location,
        agentId: `...${agentId.slice(-4)}`,
        duration: Date.now() - sessionPathStart + "ms",
      });

      return NextResponse.json({
        success: false,
        error: "Failed to create session path",
        details:
          pathError instanceof Error ? pathError.message : "Unknown error",
        config: {
          projectId: `...${projectId.slice(-4)}`,
          location,
          agentId: `...${agentId.slice(-4)}`,
        },
      });
    }

    // Test actual API call with simple message
    const apiCallStart = Date.now();
    let detectIntentResponse;

    try {
      const detectIntentRequest = {
        session: sessionPath,
        queryInput: {
          text: {
            text: "Hello, this is a connectivity test from the debug endpoint.",
          },
          languageCode: "en-US",
        },
      };

      console.log("📤 Dialogflow Test: Sending test request", {
        sessionPath: `...${sessionPath.slice(-20)}`,
        messageText:
          "Hello, this is a connectivity test from the debug endpoint.",
        languageCode: "en-US",
      });

      [detectIntentResponse] = await client.detectIntent(detectIntentRequest);

      const apiCallDuration = Date.now() - apiCallStart;

      console.log("📨 Dialogflow Test: Response received", {
        duration: apiCallDuration + "ms",
        hasResponse: !!detectIntentResponse,
        hasQueryResult: !!detectIntentResponse.queryResult,
        intent: detectIntentResponse.queryResult?.intent?.displayName,
        confidence: detectIntentResponse.queryResult?.intentDetectionConfidence,
      });
    } catch (apiError) {
      console.error("❌ Dialogflow Test: API call failed", {
        error: apiError instanceof Error ? apiError.message : "Unknown error",
        stack: apiError instanceof Error ? apiError.stack : undefined,
        duration: Date.now() - apiCallStart + "ms",
        sessionPath: `...${sessionPath.slice(-20)}`,
      });

      return NextResponse.json({
        success: false,
        error: "Dialogflow CX API call failed",
        details: apiError instanceof Error ? apiError.message : "Unknown error",
        connectionTest: {
          clientCreated: true,
          sessionPathCreated: true,
          apiCallFailed: true,
          sessionPath: `...${sessionPath.slice(-20)}`,
        },
        credentials: {
          projectId: `...${projectId.slice(-4)}`,
          clientEmail: `...${clientEmail.slice(-4)}`,
          location,
          agentId: `...${agentId.slice(-4)}`,
          apiEndpoint,
        },
      });
    }

    // Extract response text
    const responseText =
      detectIntentResponse.queryResult?.responseMessages
        ?.map((msg: any) => msg.text?.text?.[0])
        .filter(Boolean)
        .join(" ") || "No response text";

    const totalDuration = Date.now() - testStartTime;

    console.log(
      "✅ Dialogflow Test: Connectivity test completed successfully",
      {
        totalDuration: totalDuration + "ms",
        responseLength: responseText.length,
        intent: detectIntentResponse.queryResult?.intent?.displayName,
        confidence: detectIntentResponse.queryResult?.intentDetectionConfidence,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Dialogflow CX connectivity test successful",
      duration: totalDuration,
      connectionTest: {
        credentialsValid: true,
        clientCreated: true,
        sessionPathCreated: true,
        apiCallSuccessful: true,
      },
      testResponse: {
        intent: detectIntentResponse.queryResult?.intent?.displayName,
        confidence: detectIntentResponse.queryResult?.intentDetectionConfidence,
        responseText,
        responseLength: responseText.length,
      },
      configuration: {
        projectId: `...${projectId.slice(-4)}`,
        clientEmail: `...${clientEmail.slice(-4)}`,
        location,
        agentId: `...${agentId.slice(-4)}`,
        apiEndpoint,
        sessionPath: `...${sessionPath.slice(-20)}`,
      },
      nextSteps: [
        "✅ Dialogflow CX is working correctly",
        "Test RocketChat connectivity: GET /api/debug/rocketchat",
        "Test full integration: POST /api/debug/full-integration",
      ],
    });
  } catch (error) {
    const totalDuration = Date.now() - testStartTime;

    console.error("💥 Dialogflow Test: Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + "ms",
      timestamp,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Dialogflow CX test failed with unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
        duration: totalDuration,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

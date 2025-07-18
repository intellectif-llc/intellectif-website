import { NextRequest, NextResponse } from "next/server";

interface EnvironmentCheck {
  name: string;
  value: string | undefined;
  status: "✅ Present" | "❌ Missing" | "⚠️ Invalid";
  length?: number;
  preview?: string;
  notes?: string;
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();

  console.log("🔍 Environment Diagnostic: Starting comprehensive check", {
    timestamp,
    requestFrom: request.headers.get("user-agent")?.substring(0, 100),
  });

  const checks: EnvironmentCheck[] = [];

  // Check RocketChat credentials
  const rocketChatAuthToken = process.env.ROCKETCHAT_AUTH_TOKEN;
  const rocketChatUserId = process.env.ROCKETCHAT_USER_ID;

  checks.push({
    name: "ROCKETCHAT_AUTH_TOKEN",
    value: rocketChatAuthToken ? "[REDACTED]" : undefined,
    status: rocketChatAuthToken ? "✅ Present" : "❌ Missing",
    length: rocketChatAuthToken?.length,
    preview: rocketChatAuthToken
      ? `...${rocketChatAuthToken.slice(-4)}`
      : undefined,
    notes:
      "Required for RocketChat API calls (typing indicators, sending messages)",
  });

  checks.push({
    name: "ROCKETCHAT_USER_ID",
    value: rocketChatUserId ? "[REDACTED]" : undefined,
    status: rocketChatUserId ? "✅ Present" : "❌ Missing",
    length: rocketChatUserId?.length,
    preview: rocketChatUserId ? `...${rocketChatUserId.slice(-4)}` : undefined,
    notes: "Required for RocketChat API authentication",
  });

  // Check Dialogflow CX credentials
  const dialogflowProjectId = process.env.DIALOGFLOW_PROJECT_ID;
  const dialogflowClientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
  const dialogflowPrivateKey = process.env.DIALOGFLOW_PRIVATE_KEY;
  const dialogflowLocation = process.env.DIALOGFLOW_LOCATION;
  const dialogflowAgentId = process.env.DIALOGFLOW_AGENT_ID;

  checks.push({
    name: "DIALOGFLOW_PROJECT_ID",
    value: dialogflowProjectId ? "[REDACTED]" : undefined,
    status: dialogflowProjectId ? "✅ Present" : "❌ Missing",
    length: dialogflowProjectId?.length,
    preview: dialogflowProjectId
      ? `...${dialogflowProjectId.slice(-4)}`
      : undefined,
    notes: "Google Cloud project ID for Dialogflow CX",
  });

  checks.push({
    name: "DIALOGFLOW_CLIENT_EMAIL",
    value: dialogflowClientEmail ? "[REDACTED]" : undefined,
    status: dialogflowClientEmail ? "✅ Present" : "❌ Missing",
    length: dialogflowClientEmail?.length,
    preview: dialogflowClientEmail
      ? `...${dialogflowClientEmail.slice(-10)}`
      : undefined,
    notes: "Service account email for Dialogflow CX authentication",
  });

  checks.push({
    name: "DIALOGFLOW_PRIVATE_KEY",
    value: dialogflowPrivateKey ? "[REDACTED]" : undefined,
    status: dialogflowPrivateKey
      ? dialogflowPrivateKey.includes("-----BEGIN PRIVATE KEY-----")
        ? "✅ Present"
        : "⚠️ Invalid"
      : "❌ Missing",
    length: dialogflowPrivateKey?.length,
    preview: dialogflowPrivateKey ? "[REDACTED PEM KEY]" : undefined,
    notes:
      "Service account private key - should start with -----BEGIN PRIVATE KEY-----",
  });

  checks.push({
    name: "DIALOGFLOW_LOCATION",
    value: dialogflowLocation ? "[REDACTED]" : undefined,
    status: dialogflowLocation ? "✅ Present" : "❌ Missing",
    length: dialogflowLocation?.length,
    preview: dialogflowLocation,
    notes: "Dialogflow CX location (e.g., us-central1, global)",
  });

  checks.push({
    name: "DIALOGFLOW_AGENT_ID",
    value: dialogflowAgentId ? "[REDACTED]" : undefined,
    status: dialogflowAgentId ? "✅ Present" : "❌ Missing",
    length: dialogflowAgentId?.length,
    preview: dialogflowAgentId
      ? `...${dialogflowAgentId.slice(-4)}`
      : undefined,
    notes: "Dialogflow CX agent ID",
  });

  // Check integration flags
  const bridgeEnabled = process.env.ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE;
  const autoResponseEnabled = process.env.ENABLE_ROCKETCHAT_AUTO_RESPONSE;

  checks.push({
    name: "ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE",
    value: bridgeEnabled ? "[REDACTED]" : undefined,
    status:
      bridgeEnabled === "true"
        ? "✅ Present"
        : bridgeEnabled
        ? "⚠️ Invalid"
        : "❌ Missing",
    preview: bridgeEnabled,
    notes: "Should be 'true' to enable the integration",
  });

  checks.push({
    name: "ENABLE_ROCKETCHAT_AUTO_RESPONSE",
    value: autoResponseEnabled ? "[REDACTED]" : undefined,
    status:
      autoResponseEnabled === "true"
        ? "✅ Present"
        : autoResponseEnabled
        ? "⚠️ Invalid"
        : "❌ Missing",
    preview: autoResponseEnabled,
    notes: "Should be 'true' to enable automatic responses",
  });

  // Check other important variables
  const nodeEnv = process.env.NODE_ENV;

  checks.push({
    name: "NODE_ENV",
    value: nodeEnv ? "[REDACTED]" : undefined,
    status: nodeEnv ? "✅ Present" : "❌ Missing",
    preview: nodeEnv,
    notes: "Current environment (development, production, etc.)",
  });

  // Count status
  const presentCount = checks.filter((c) => c.status === "✅ Present").length;
  const missingCount = checks.filter((c) => c.status === "❌ Missing").length;
  const invalidCount = checks.filter((c) => c.status === "⚠️ Invalid").length;

  const overallStatus =
    missingCount === 0 && invalidCount === 0
      ? "✅ All variables configured correctly"
      : `❌ ${missingCount} missing, ${invalidCount} invalid variables found`;

  console.log("🔍 Environment Diagnostic: Check complete", {
    timestamp,
    overallStatus,
    presentCount,
    missingCount,
    invalidCount,
    details: checks.map((c) => ({
      name: c.name,
      status: c.status,
      hasValue: !!c.value,
    })),
  });

  // Test if credentials can create basic objects
  let credentialTests: any = {};

  try {
    if (dialogflowProjectId && dialogflowClientEmail && dialogflowPrivateKey) {
      credentialTests.dialogflowCredentials = {
        status: "✅ Can create credentials object",
        details: {
          projectId: `...${dialogflowProjectId.slice(-4)}`,
          clientEmail: `...${dialogflowClientEmail.slice(-4)}`,
          privateKeyValid: dialogflowPrivateKey.includes(
            "-----BEGIN PRIVATE KEY-----"
          ),
          privateKeyLength: dialogflowPrivateKey.length,
        },
      };
    } else {
      credentialTests.dialogflowCredentials = {
        status: "❌ Cannot create credentials - missing required fields",
        missing: [
          !dialogflowProjectId && "DIALOGFLOW_PROJECT_ID",
          !dialogflowClientEmail && "DIALOGFLOW_CLIENT_EMAIL",
          !dialogflowPrivateKey && "DIALOGFLOW_PRIVATE_KEY",
        ].filter(Boolean),
      };
    }
  } catch (error) {
    credentialTests.dialogflowCredentials = {
      status: "❌ Error creating credentials",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return NextResponse.json({
    success: true,
    timestamp,
    overallStatus,
    summary: {
      total: checks.length,
      present: presentCount,
      missing: missingCount,
      invalid: invalidCount,
    },
    checks,
    credentialTests,
    recommendations: [
      missingCount > 0 &&
        "Add missing environment variables to AWS Amplify console",
      invalidCount > 0 && "Fix invalid environment variable formats",
      dialogflowPrivateKey &&
        !dialogflowPrivateKey.includes("-----BEGIN PRIVATE KEY-----") &&
        "DIALOGFLOW_PRIVATE_KEY should include full PEM format with headers",
      bridgeEnabled !== "true" &&
        "Set ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE=true",
      autoResponseEnabled !== "true" &&
        "Set ENABLE_ROCKETCHAT_AUTO_RESPONSE=true",
    ].filter(Boolean),
    nextSteps: [
      "Test Dialogflow CX connectivity: GET /api/debug/dialogflow",
      "Test RocketChat API connectivity: GET /api/debug/rocketchat",
      "Test full integration: POST /api/debug/full-integration",
    ],
  });
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

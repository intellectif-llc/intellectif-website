import { NextRequest, NextResponse } from "next/server";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const testStartTime = Date.now();

  console.log("🧪 Full Integration Test: Starting end-to-end test", {
    timestamp,
    requestFrom: request.headers.get("user-agent")?.substring(0, 100),
  });

  try {
    // Parse test parameters
    const body = await request.json();
    const testMessage =
      body.message ||
      "Hello, this is a full integration test from the debug endpoint.";
    const testRoomId = body.roomId || "debug-test-room-id";
    const testUserId = body.userId || "debug-test-user-id";

    console.log("🔧 Full Integration Test: Test parameters", {
      testMessage,
      testRoomId,
      testUserId,
      messageLength: testMessage.length,
    });

    const results: any = {
      timestamp,
      testParameters: { testMessage, testRoomId, testUserId },
      steps: {},
      errors: [],
      warnings: [],
    };

    // Step 1: Environment Variables Check
    console.log("1️⃣ Full Integration Test: Checking environment variables");
    const envCheckStart = Date.now();

    const requiredVars = [
      "ROCKETCHAT_AUTH_TOKEN",
      "ROCKETCHAT_USER_ID",
      "DIALOGFLOW_PROJECT_ID",
      "DIALOGFLOW_CLIENT_EMAIL",
      "DIALOGFLOW_PRIVATE_KEY",
      "DIALOGFLOW_LOCATION",
      "DIALOGFLOW_AGENT_ID",
      "ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE",
      "ENABLE_ROCKETCHAT_AUTO_RESPONSE",
    ];

    const envCheck: any = {
      duration: 0,
      present: 0,
      missing: [],
      invalid: [],
      values: {},
    };

    for (const varName of requiredVars) {
      const value = process.env[varName];
      envCheck.values[varName] = {
        present: !!value,
        length: value?.length || 0,
        preview: value
          ? varName.includes("PRIVATE_KEY")
            ? "-----BEGIN PRIVATE KEY-----..."
            : varName.includes("TOKEN") ||
              varName.includes("USER_ID") ||
              varName.includes("AGENT_ID")
            ? `...${value.slice(-4)}`
            : value
          : undefined,
      };

      if (!value) {
        envCheck.missing.push(varName);
      } else {
        envCheck.present++;

        // Validate specific formats
        if (
          varName === "DIALOGFLOW_PRIVATE_KEY" &&
          !value.includes("-----BEGIN PRIVATE KEY-----")
        ) {
          envCheck.invalid.push(`${varName}: Invalid PEM format`);
        }
        if (
          (varName === "ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE" ||
            varName === "ENABLE_ROCKETCHAT_AUTO_RESPONSE") &&
          value !== "true"
        ) {
          envCheck.invalid.push(`${varName}: Should be 'true', got '${value}'`);
        }
      }
    }

    envCheck.duration = Date.now() - envCheckStart;
    results.steps.environmentCheck = envCheck;

    console.log("1️⃣ Environment Check Result", {
      present: envCheck.present,
      missing: envCheck.missing.length,
      invalid: envCheck.invalid.length,
      duration: envCheck.duration + "ms",
    });

    if (envCheck.missing.length > 0) {
      results.errors.push(
        `Missing environment variables: ${envCheck.missing.join(", ")}`
      );
    }
    if (envCheck.invalid.length > 0) {
      results.errors.push(
        `Invalid environment variables: ${envCheck.invalid.join(", ")}`
      );
    }

    // Step 2: Dialogflow CX Connection Test
    console.log("2️⃣ Full Integration Test: Testing Dialogflow CX connection");
    const dialogflowTestStart = Date.now();

    const dialogflowTest: any = {
      duration: 0,
      success: false,
      error: null,
      response: null,
    };

    try {
      const projectId = process.env.DIALOGFLOW_PROJECT_ID;
      const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
      const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;
      const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
      const agentId = process.env.DIALOGFLOW_AGENT_ID;

      if (projectId && clientEmail && privateKey && agentId) {
        const credentials = {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, "\n"),
        };

        const apiEndpoint =
          location === "global"
            ? "dialogflow.googleapis.com"
            : `${location}-dialogflow.googleapis.com`;
        const client = new SessionsClient({
          credentials,
          projectId,
          apiEndpoint,
        });

        const sessionId = `full-test-${Date.now()}`;
        const sessionPath = client.projectLocationAgentSessionPath(
          projectId,
          location,
          agentId,
          sessionId
        );

        const detectIntentRequest = {
          session: sessionPath,
          queryInput: {
            text: { text: testMessage },
            languageCode: "en-US",
          },
        };

        const [response] = await client.detectIntent(detectIntentRequest);

        const responseText =
          response.queryResult?.responseMessages
            ?.map((msg: any) => msg.text?.text?.[0])
            .filter(Boolean)
            .join(" ") || "No response text";

        dialogflowTest.success = true;
        dialogflowTest.response = {
          intent: response.queryResult?.intent?.displayName,
          confidence: response.queryResult?.intentDetectionConfidence,
          responseText,
          responseLength: responseText.length,
        };

        console.log("2️⃣ Dialogflow Test: Success", {
          intent: dialogflowTest.response.intent,
          confidence: dialogflowTest.response.confidence,
          responseLength: dialogflowTest.response.responseLength,
        });
      } else {
        throw new Error("Missing Dialogflow CX credentials");
      }
    } catch (error) {
      dialogflowTest.success = false;
      dialogflowTest.error =
        error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`Dialogflow CX test failed: ${dialogflowTest.error}`);

      console.error("2️⃣ Dialogflow Test: Failed", {
        error: dialogflowTest.error,
      });
    }

    dialogflowTest.duration = Date.now() - dialogflowTestStart;
    results.steps.dialogflowTest = dialogflowTest;

    // Step 3: RocketChat API Test
    console.log("3️⃣ Full Integration Test: Testing RocketChat API");
    const rocketChatTestStart = Date.now();

    const rocketChatTest: any = {
      duration: 0,
      authSuccess: false,
      typingSuccess: false,
      messageSuccess: false,
      errors: [],
    };

    try {
      const authToken = process.env.ROCKETCHAT_AUTH_TOKEN;
      const userId = process.env.ROCKETCHAT_USER_ID;
      const baseUrl = "https://chat.intellectif.com";

      if (authToken && userId) {
        // Test authentication
        const authResponse = await fetch(`${baseUrl}/api/v1/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": authToken,
            "X-User-Id": userId,
          },
        });

        if (authResponse.ok) {
          rocketChatTest.authSuccess = true;
          console.log("3️⃣ RocketChat Auth: Success");
        } else {
          const errorText = await authResponse.text();
          rocketChatTest.errors.push(
            `Auth failed: ${authResponse.status} - ${errorText}`
          );
          console.error("3️⃣ RocketChat Auth: Failed", {
            status: authResponse.status,
          });
        }

        // Test typing indicator (expect 404 for fake room)
        const typingResponse = await fetch(
          `${baseUrl}/api/v1/rooms.startTyping`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Auth-Token": authToken,
              "X-User-Id": userId,
            },
            body: JSON.stringify({ roomId: testRoomId }),
          }
        );

        // 404 is expected for fake room, but endpoint should be accessible
        if (typingResponse.status === 404 || typingResponse.status === 200) {
          rocketChatTest.typingSuccess = true;
          console.log("3️⃣ RocketChat Typing: Endpoint accessible");
        } else if (
          typingResponse.status === 401 ||
          typingResponse.status === 403
        ) {
          rocketChatTest.errors.push(
            `Typing endpoint auth failed: ${typingResponse.status}`
          );
          console.error("3️⃣ RocketChat Typing: Auth failed", {
            status: typingResponse.status,
          });
        } else {
          console.log("3️⃣ RocketChat Typing: Unexpected response", {
            status: typingResponse.status,
          });
        }

        // Test message posting (expect 404 for fake room)
        const messageResponse = await fetch(
          `${baseUrl}/api/v1/chat.postMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Auth-Token": authToken,
              "X-User-Id": userId,
            },
            body: JSON.stringify({
              roomId: testRoomId,
              text: "Integration test message",
              alias: "Test Bot",
            }),
          }
        );

        // 404 is expected for fake room, but endpoint should be accessible
        if (messageResponse.status === 404 || messageResponse.status === 200) {
          rocketChatTest.messageSuccess = true;
          console.log("3️⃣ RocketChat Message: Endpoint accessible");
        } else if (
          messageResponse.status === 401 ||
          messageResponse.status === 403
        ) {
          rocketChatTest.errors.push(
            `Message endpoint auth failed: ${messageResponse.status}`
          );
          console.error("3️⃣ RocketChat Message: Auth failed", {
            status: messageResponse.status,
          });
        } else {
          console.log("3️⃣ RocketChat Message: Unexpected response", {
            status: messageResponse.status,
          });
        }
      } else {
        throw new Error("Missing RocketChat credentials");
      }
    } catch (error) {
      rocketChatTest.errors.push(
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error("3️⃣ RocketChat Test: Failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    rocketChatTest.duration = Date.now() - rocketChatTestStart;
    results.steps.rocketChatTest = rocketChatTest;

    if (rocketChatTest.errors.length > 0) {
      results.errors.push(
        ...rocketChatTest.errors.map((e: string) => `RocketChat: ${e}`)
      );
    }

    // Step 4: Integration Flags Check
    console.log("4️⃣ Full Integration Test: Checking integration flags");
    const flagsCheck = {
      bridgeEnabled: process.env.ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE === "true",
      autoResponseEnabled:
        process.env.ENABLE_ROCKETCHAT_AUTO_RESPONSE === "true",
    };

    results.steps.integrationFlags = flagsCheck;

    if (!flagsCheck.bridgeEnabled) {
      results.warnings.push(
        "ENABLE_ROCKETCHAT_DIALOGFLOW_BRIDGE is not set to 'true'"
      );
    }
    if (!flagsCheck.autoResponseEnabled) {
      results.warnings.push(
        "ENABLE_ROCKETCHAT_AUTO_RESPONSE is not set to 'true'"
      );
    }

    console.log("4️⃣ Integration Flags", flagsCheck);

    // Final Results
    const totalDuration = Date.now() - testStartTime;
    const overallSuccess = results.errors.length === 0;

    console.log("🧪 Full Integration Test: Complete", {
      success: overallSuccess,
      duration: totalDuration + "ms",
      errors: results.errors.length,
      warnings: results.warnings.length,
    });

    return NextResponse.json({
      success: overallSuccess,
      duration: totalDuration,
      message: overallSuccess
        ? "Full integration test passed! All components are working correctly."
        : `Integration test failed with ${results.errors.length} error(s).`,
      results,
      recommendations: [
        ...results.errors.map((e: string) => `❌ Fix: ${e}`),
        ...results.warnings.map((w: string) => `⚠️ Warning: ${w}`),
        overallSuccess && "✅ Integration is working correctly",
        !overallSuccess &&
          envCheck.missing.length > 0 &&
          "Add missing environment variables to AWS Amplify",
        !overallSuccess &&
          "Check CloudWatch logs for detailed error information",
        "Test the actual webhook: Send a message in RocketChat to trigger the integration",
      ].filter(Boolean),
      nextSteps: overallSuccess
        ? [
            "✅ All tests passed!",
            "Send a real message in RocketChat to test the full flow",
            "Monitor CloudWatch logs for any issues during real usage",
          ]
        : [
            "❌ Fix the issues identified above",
            "Re-run this test after making changes",
            "Check individual component tests: /api/debug/environment, /api/debug/dialogflow, /api/debug/rocketchat",
          ],
    });
  } catch (error) {
    const totalDuration = Date.now() - testStartTime;

    console.error("💥 Full Integration Test: Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + "ms",
      timestamp,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Full integration test failed with unexpected error",
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

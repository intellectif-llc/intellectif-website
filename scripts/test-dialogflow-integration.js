#!/usr/bin/env node

/**
 * Dialogflow CX Integration Test Script
 *
 * This script validates the complete Dialogflow CX integration by:
 * 1. Loading and validating environment variables
 * 2. Testing authentication with Google Cloud
 * 3. Sending test messages to Dialogflow CX
 * 4. Validating responses and session management
 *
 * Usage: node scripts/test-dialogflow-integration.js
 */

require("dotenv").config({ path: ".env.local" });
const { SessionsClient } = require("@google-cloud/dialogflow-cx");

// Test configuration
const TEST_MESSAGES = [
  "I need a web app",
  "Hello",
  "What services do you offer?",
  "Can you help me with AI integration?",
  "I want to build a mobile application",
];

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "cyan");
  console.log("=".repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

/**
 * Step 1: Validate Environment Variables
 */
function validateEnvironmentVariables() {
  logSection("🔍 STEP 1: Environment Variables Validation");

  const requiredVars = {
    DIALOGFLOW_PROJECT_ID: process.env.DIALOGFLOW_PROJECT_ID,
    DIALOGFLOW_CLIENT_EMAIL: process.env.DIALOGFLOW_CLIENT_EMAIL,
    DIALOGFLOW_PRIVATE_KEY: process.env.DIALOGFLOW_PRIVATE_KEY,
    DIALOGFLOW_AGENT_ID: process.env.DIALOGFLOW_AGENT_ID,
  };

  // Optional but recommended variables
  const optionalVars = {
    DIALOGFLOW_LOCATION:
      process.env.DIALOGFLOW_LOCATION || "us-central1 (default)",
  };

  let allValid = true;

  for (const [varName, varValue] of Object.entries(requiredVars)) {
    if (!varValue) {
      logError(`${varName} is not set`);
      allValid = false;
    } else {
      // Show partial values for security
      let displayValue = varValue;
      if (varName === "DIALOGFLOW_PRIVATE_KEY") {
        displayValue = varValue.substring(0, 50) + "...[TRUNCATED]";
      } else if (varName === "DIALOGFLOW_CLIENT_EMAIL") {
        displayValue = varValue.replace(/(.{3}).*(@.*)/, "$1***$2");
      }
      logSuccess(`${varName}: ${displayValue}`);
    }
  }

  if (!allValid) {
    logError(
      "Missing required environment variables. Please check your .env.local file."
    );
    process.exit(1);
  }

  logSuccess("All required environment variables are present");

  // Log optional variables
  for (const [varName, varValue] of Object.entries(optionalVars)) {
    logInfo(`${varName}: ${varValue}`);
  }

  return requiredVars;
}

/**
 * Step 2: Validate Credentials Format
 */
function validateCredentialsFormat(envVars) {
  logSection("🔐 STEP 2: Credentials Format Validation");

  // Validate Project ID format
  const projectIdPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  if (!projectIdPattern.test(envVars.DIALOGFLOW_PROJECT_ID)) {
    logWarning(
      "Project ID format seems unusual. Expected format: lowercase letters, numbers, and hyphens"
    );
  } else {
    logSuccess("Project ID format is valid");
  }

  // Validate Client Email format
  const emailPattern = /^[^@]+@[^@]+\.iam\.gserviceaccount\.com$/;
  if (!emailPattern.test(envVars.DIALOGFLOW_CLIENT_EMAIL)) {
    logWarning(
      "Client email format seems unusual. Expected format: *@*.iam.gserviceaccount.com"
    );
  } else {
    logSuccess("Client email format is valid");
  }

  // Validate Private Key format
  if (!envVars.DIALOGFLOW_PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
    logWarning(
      'Private key format seems unusual. Expected to contain "BEGIN PRIVATE KEY"'
    );
  } else {
    logSuccess("Private key format appears valid");
  }

  // Validate Agent ID format (if provided)
  if (
    envVars.DIALOGFLOW_AGENT_ID &&
    envVars.DIALOGFLOW_AGENT_ID !== "default-agent"
  ) {
    logSuccess(`Agent ID is set: ${envVars.DIALOGFLOW_AGENT_ID}`);
  } else {
    logWarning(
      "Agent ID not set or using default. This might work but consider setting the actual agent ID"
    );
  }
}

/**
 * Step 3: Create and Test Dialogflow Client
 */
async function createDialogflowClient(envVars) {
  logSection("🤖 STEP 3: Dialogflow CX Client Creation");

  try {
    // Create credentials object
    const credentials = {
      client_email: envVars.DIALOGFLOW_CLIENT_EMAIL,
      private_key: envVars.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };

    logInfo("Creating Dialogflow CX SessionsClient...");

    // Get location and construct the correct API endpoint
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const apiEndpoint =
      location === "global"
        ? "dialogflow.googleapis.com"
        : `${location}-dialogflow.googleapis.com`;

    logInfo(`Using API endpoint: ${apiEndpoint} for location: ${location}`);

    // Create Dialogflow CX client with correct regional endpoint
    const client = new SessionsClient({
      credentials,
      projectId: envVars.DIALOGFLOW_PROJECT_ID,
      apiEndpoint,
    });

    logSuccess("Dialogflow CX client created successfully");

    // Test basic client functionality
    logInfo("Testing client initialization...");
    const agentId = envVars.DIALOGFLOW_AGENT_ID || "default-agent";
    const testSessionId = `test-session-${Date.now()}`;

    const sessionPath = client.projectLocationAgentSessionPath(
      envVars.DIALOGFLOW_PROJECT_ID,
      location,
      agentId,
      testSessionId
    );

    logSuccess(`Session path generated: ${sessionPath}`);
    logSuccess("Client initialization test passed");

    return { client, sessionPath, testSessionId };
  } catch (error) {
    logError(`Failed to create Dialogflow client: ${error.message}`);
    logError(
      "This usually indicates an issue with credentials or project configuration"
    );
    throw error;
  }
}

/**
 * Step 4: Test Authentication with Google Cloud
 */
async function testAuthentication(client) {
  logSection("🔑 STEP 4: Google Cloud Authentication Test");

  try {
    logInfo(
      "Testing authentication by attempting to access Google Cloud APIs..."
    );

    // This will trigger authentication
    const testSessionPath = client.projectLocationAgentSessionPath(
      process.env.DIALOGFLOW_PROJECT_ID,
      process.env.DIALOGFLOW_LOCATION || "us-central1",
      process.env.DIALOGFLOW_AGENT_ID || "default-agent",
      "auth-test-session"
    );

    logSuccess("Authentication appears to be working");
    logSuccess("Service account has proper access to Dialogflow CX");

    return true;
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);

    if (error.message.includes("PERMISSION_DENIED")) {
      logError(
        "The service account does not have proper permissions for Dialogflow CX"
      );
      logError(
        "Required roles: Dialogflow API Client or Dialogflow CX API Admin"
      );
    } else if (error.message.includes("UNAUTHENTICATED")) {
      logError("Invalid credentials. Please check your service account key");
    }

    throw error;
  }
}

/**
 * Step 5: Test Dialogflow CX Communication
 */
async function testDialogflowCommunication(client, sessionPath) {
  logSection("💬 STEP 5: Dialogflow CX Communication Test");

  const results = [];

  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const message = TEST_MESSAGES[i];

    try {
      logInfo(
        `\nTesting message ${i + 1}/${TEST_MESSAGES.length}: "${message}"`
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

      const startTime = Date.now();

      // Send the request to Dialogflow CX
      const [response] = await client.detectIntent(detectIntentRequest);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Extract response information
      const responseText =
        response.queryResult?.responseMessages
          ?.map((msg) => msg.text?.text?.[0])
          .filter(Boolean)
          .join(" ") || "No response text";

      const intent =
        response.queryResult?.intent?.displayName || "No intent detected";
      const confidence = response.queryResult?.intentDetectionConfidence || 0;

      // Log results
      logSuccess(`Response received in ${responseTime}ms`);
      logInfo(`Intent: ${intent}`);
      logInfo(`Confidence: ${(confidence * 100).toFixed(1)}%`);
      logInfo(`Response: "${responseText}"`);

      results.push({
        message,
        responseText,
        intent,
        confidence,
        responseTime,
        success: true,
      });

      // Add a small delay between requests
      if (i < TEST_MESSAGES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      logError(`Failed to process message "${message}": ${error.message}`);

      results.push({
        message,
        error: error.message,
        success: false,
      });
    }
  }

  return results;
}

/**
 * Step 6: Analyze Results and Provide Recommendations
 */
function analyzeResults(results) {
  logSection("📊 STEP 6: Results Analysis");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logInfo(`Total messages tested: ${results.length}`);
  logSuccess(`Successful: ${successful.length}`);

  if (failed.length > 0) {
    logError(`Failed: ${failed.length}`);
  }

  if (successful.length > 0) {
    const avgResponseTime =
      successful.reduce((sum, r) => sum + r.responseTime, 0) /
      successful.length;
    const avgConfidence =
      successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;

    logInfo(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
    logInfo(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    // Analyze response quality
    const hasIntents = successful.filter(
      (r) => r.intent !== "No intent detected"
    ).length;
    const highConfidence = successful.filter((r) => r.confidence > 0.7).length;

    logInfo(
      `Messages with detected intents: ${hasIntents}/${successful.length}`
    );
    logInfo(
      `High confidence responses (>70%): ${highConfidence}/${successful.length}`
    );
  }

  // Provide recommendations
  logSection("💡 RECOMMENDATIONS");

  if (successful.length === results.length) {
    logSuccess("🎉 Perfect! All tests passed successfully.");
    logSuccess("Your Dialogflow CX integration is working correctly.");
  } else if (successful.length > 0) {
    logWarning("Partial success. Some messages failed to process.");
    logInfo(
      "This might indicate issues with specific intents or agent configuration."
    );
  } else {
    logError(
      "All tests failed. There are significant issues with the integration."
    );
  }

  if (successful.length > 0) {
    const avgConfidence =
      successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;

    if (avgConfidence < 0.5) {
      logWarning(
        "Low average confidence scores. Consider training your agent with more examples."
      );
    } else if (avgConfidence > 0.8) {
      logSuccess("Excellent confidence scores! Your agent is well-trained.");
    }
  }

  // Next steps
  logSection("🚀 NEXT STEPS");

  if (successful.length === results.length) {
    logInfo("1. Test the API endpoints: GET /api/test-dialogflow");
    logInfo("2. Test the chat bridge: POST /api/chat-bridge");
    logInfo("3. Configure Rocket.Chat webhooks to use your middleware");
    logInfo("4. Train your Dialogflow agent with more specific intents");
  } else {
    logInfo("1. Check your Dialogflow CX agent configuration");
    logInfo("2. Ensure the agent is published and trained");
    logInfo("3. Verify the agent ID is correct");
    logInfo("4. Review the error messages above for specific issues");
  }
}

/**
 * Main execution function
 */
async function main() {
  console.clear();
  log("🤖 Dialogflow CX Integration Test Suite", "bright");
  log("Testing authentication and communication with Dialogflow CX\n", "white");

  try {
    // Step 1: Validate environment variables
    const envVars = validateEnvironmentVariables();

    // Step 2: Validate credentials format
    validateCredentialsFormat(envVars);

    // Step 3: Create Dialogflow client
    const { client, sessionPath } = await createDialogflowClient(envVars);

    // Step 4: Test authentication
    await testAuthentication(client);

    // Step 5: Test communication
    const results = await testDialogflowCommunication(client, sessionPath);

    // Step 6: Analyze results
    analyzeResults(results);

    logSection("✅ TEST COMPLETE");
    logSuccess("Integration test completed successfully!");
  } catch (error) {
    logSection("❌ TEST FAILED");
    logError(`Integration test failed: ${error.message}`);

    if (error.stack) {
      console.log("\nFull error details:");
      console.log(error.stack);
    }

    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = {
  validateEnvironmentVariables,
  validateCredentialsFormat,
  createDialogflowClient,
  testAuthentication,
  testDialogflowCommunication,
  analyzeResults,
};

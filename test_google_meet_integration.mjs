#!/usr/bin/env node

/**
 * Google Meet Integration Test Script
 *
 * This script tests the Google Meet REST API integration using either:
 * 1. Service Account authentication (recommended)
 * 2. OAuth 2.0 with refresh token (fallback)
 *
 * No individual consultant OAuth connections required!
 *
 * Note: Since this is a standalone Node.js script, environment variables
 * need to be set in your system environment or passed via the command line.
 * For testing locally, you can run:
 * GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email GOOGLE_SERVICE_ACCOUNT_KEY='your-key' npm run test:google-meet
 */

import { google } from "googleapis";

class GoogleMeetTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix =
      {
        info: "📋",
        success: "✅",
        error: "❌",
        warning: "⚠️",
      }[type] || "📋";

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  test(description, fn) {
    try {
      const result = fn();
      if (result) {
        this.log(`${description}: PASSED`, "success");
        this.results.passed++;
      } else {
        this.log(`${description}: FAILED`, "error");
        this.results.failed++;
        this.results.errors.push(description);
      }
    } catch (error) {
      this.log(`${description}: ERROR - ${error.message}`, "error");
      this.results.failed++;
      this.results.errors.push(`${description}: ${error.message}`);
    }
  }

  async testAsync(description, fn) {
    try {
      const result = await fn();
      if (result) {
        this.log(`${description}: PASSED`, "success");
        this.results.passed++;
      } else {
        this.log(`${description}: FAILED`, "error");
        this.results.failed++;
        this.results.errors.push(description);
      }
    } catch (error) {
      this.log(`${description}: ERROR - ${error.message}`, "error");
      this.results.failed++;
      this.results.errors.push(`${description}: ${error.message}`);
    }
  }

  // Test environment variables
  testEnvironmentVariables() {
    this.log("\n🔍 Testing Environment Variables...");

    this.test(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID exists",
      () => !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    );

    this.test(
      "GOOGLE_CLIENT_SECRET exists",
      () => !!process.env.GOOGLE_CLIENT_SECRET
    );

    // Check for service account credentials
    const hasServiceAccount = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    );

    // Check for OAuth credentials
    const hasOAuthCredentials = !!(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    );

    this.test(
      "Has Service Account OR OAuth credentials",
      () => hasServiceAccount || hasOAuthCredentials
    );

    if (hasServiceAccount) {
      this.log(
        "✨ Using Service Account authentication (recommended)",
        "success"
      );
      this.test("Service account email format", () =>
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.includes("@")
      );

      this.test("Service account key is valid JSON", () => {
        try {
          JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
          return true;
        } catch {
          return false;
        }
      });
    } else if (hasOAuthCredentials) {
      this.log("🔄 Using OAuth 2.0 authentication", "warning");
    } else {
      this.log("❌ No valid authentication method found", "error");
    }
  }

  // Test Google APIs access
  async testGoogleAPIsAccess() {
    this.log("\n🌐 Testing Google APIs Access...");

    try {
      // Test service account authentication
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        await this.testAsync("Service Account Authentication", async () => {
          const credentials = JSON.parse(
            process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          );

          const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
              "https://www.googleapis.com/auth/meetings.space.created",
              "https://www.googleapis.com/auth/meetings.space.readonly",
            ],
          });

          await auth.authorize();
          return !!auth.credentials.access_token;
        });
      }

      // Test OAuth authentication
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        await this.testAsync("OAuth 2.0 Authentication", async () => {
          const oauth2Client = new google.auth.OAuth2(
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
          );

          oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });

          const { credentials } = await oauth2Client.refreshAccessToken();
          return !!credentials.access_token;
        });
      }
    } catch (error) {
      this.log(`Authentication test failed: ${error.message}`, "error");
    }
  }

  // Test Google Meet API functionality
  async testGoogleMeetAPI() {
    this.log("\n🎥 Testing Google Meet API...");

    try {
      let auth;

      // Set up authentication
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: [
            "https://www.googleapis.com/auth/meetings.space.created",
            "https://www.googleapis.com/auth/meetings.space.readonly",
          ],
        });
        await auth.authorize();
      } else if (process.env.GOOGLE_REFRESH_TOKEN) {
        auth = new google.auth.OAuth2(
          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          "https://developers.google.com/oauthplayground"
        );
        auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
      } else {
        throw new Error("No valid authentication method available");
      }

      // Test creating a meeting space
      await this.testAsync("Create Google Meet Space", async () => {
        const meet = google.meet({ version: "v2", auth });

        const space = await meet.spaces.create({
          requestBody: {},
        });

        this.log(
          `✨ Created meeting space: ${space.data.meetingUri}`,
          "success"
        );
        this.log(`📋 Meeting code: ${space.data.meetingCode}`, "info");
        this.log(`🆔 Space ID: ${space.data.name}`, "info");

        return !!(space.data && space.data.meetingUri);
      });
    } catch (error) {
      this.log(`Google Meet API test failed: ${error.message}`, "error");
      this.results.failed++;
      this.results.errors.push(`Google Meet API: ${error.message}`);
    }
  }

  // Generate setup instructions
  generateSetupInstructions() {
    this.log("\n📝 Setup Instructions:", "info");

    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
      !process.env.GOOGLE_REFRESH_TOKEN
    ) {
      this.log("\n🔧 To set up Google Meet integration:", "warning");
      this.log("");
      this.log("Option 1: Service Account (Recommended)");
      this.log(
        "1. Go to Google Cloud Console → IAM & Admin → Service Accounts"
      );
      this.log("2. Create a new service account");
      this.log("3. Download the JSON key file");
      this.log("4. Set GOOGLE_SERVICE_ACCOUNT_KEY to the JSON content");
      this.log(
        "5. Set GOOGLE_SERVICE_ACCOUNT_EMAIL to the service account email"
      );
      this.log("6. Enable Google Meet API in Google Cloud Console");
      this.log("");
      this.log("Option 2: OAuth 2.0");
      this.log("1. Go to Google Cloud Console → APIs & Services → Credentials");
      this.log("2. Create OAuth 2.0 Client ID (Web application)");
      this.log("3. Use OAuth Playground to get a refresh token");
      this.log("4. Set GOOGLE_REFRESH_TOKEN in your environment");
    }
  }

  // Print final results
  printResults() {
    this.log("\n📊 Test Results Summary:", "info");
    this.log(`✅ Tests Passed: ${this.results.passed}`, "success");
    this.log(
      `❌ Tests Failed: ${this.results.failed}`,
      this.results.failed > 0 ? "error" : "success"
    );

    if (this.results.errors.length > 0) {
      this.log("\n🔍 Failed Tests:", "error");
      this.results.errors.forEach((error) => {
        this.log(`  • ${error}`, "error");
      });
    }

    const successRate = Math.round(
      (this.results.passed / (this.results.passed + this.results.failed)) * 100
    );
    this.log(
      `\n📈 Success Rate: ${successRate}%`,
      successRate >= 80 ? "success" : "warning"
    );

    if (successRate >= 80) {
      this.log("\n🎉 Google Meet integration is ready to use!", "success");
    } else {
      this.log(
        "\n⚠️ Please fix the failed tests before using Google Meet integration.",
        "warning"
      );
    }
  }

  // Run all tests
  async runAllTests() {
    this.log("🚀 Starting Google Meet Integration Tests...\n");

    this.testEnvironmentVariables();
    await this.testGoogleAPIsAccess();
    await this.testGoogleMeetAPI();
    this.generateSetupInstructions();
    this.printResults();
  }
}

// Run the tests
const tester = new GoogleMeetTester();
tester.runAllTests().catch((error) => {
  console.error("❌ Test runner failed:", error);
  process.exit(1);
});

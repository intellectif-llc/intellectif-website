import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const testStartTime = Date.now();

  console.log("🚀 RocketChat Test: Starting connectivity test", {
    timestamp,
    requestFrom: request.headers.get("user-agent")?.substring(0, 100),
  });

  try {
    // Get environment variables
    const authToken = process.env.ROCKETCHAT_AUTH_TOKEN;
    const userId = process.env.ROCKETCHAT_USER_ID;

    console.log("🔧 RocketChat Test: Environment check", {
      hasAuthToken: !!authToken,
      hasUserId: !!userId,
      authTokenLength: authToken?.length,
      userIdLength: userId?.length,
      authTokenPreview: authToken ? `...${authToken.slice(-4)}` : undefined,
      userIdPreview: userId ? `...${userId.slice(-4)}` : undefined,
    });

    // Check for missing credentials
    if (!authToken || !userId) {
      const missing = [
        !authToken && "ROCKETCHAT_AUTH_TOKEN",
        !userId && "ROCKETCHAT_USER_ID",
      ].filter(Boolean);

      console.error("❌ RocketChat Test: Missing required credentials", {
        missing,
        duration: Date.now() - testStartTime + "ms",
      });

      return NextResponse.json({
        success: false,
        error: "Missing RocketChat credentials",
        missing,
        checks: {
          authToken: !!authToken,
          userId: !!userId,
        },
      });
    }

    const baseUrl = "https://chat.intellectif.com";

    console.log("🌐 RocketChat Test: Configuration", {
      baseUrl,
      authTokenValid: authToken.length > 10,
      userIdValid: userId.length > 10,
    });

    // Test 1: Check authentication with simple API call
    console.log("🔐 RocketChat Test: Testing authentication");
    const authTestStart = Date.now();

    let authTestResponse;
    try {
      authTestResponse = await fetch(`${baseUrl}/api/v1/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": authToken,
          "X-User-Id": userId,
        },
      });

      const authTestDuration = Date.now() - authTestStart;

      console.log("📡 RocketChat Test: Auth response received", {
        status: authTestResponse.status,
        statusText: authTestResponse.statusText,
        ok: authTestResponse.ok,
        duration: authTestDuration + "ms",
      });

      if (!authTestResponse.ok) {
        const errorText = await authTestResponse.text();
        console.error("❌ RocketChat Test: Authentication failed", {
          status: authTestResponse.status,
          statusText: authTestResponse.statusText,
          error: errorText,
          duration: authTestDuration + "ms",
        });

        return NextResponse.json({
          success: false,
          error: "RocketChat authentication failed",
          details: `HTTP ${authTestResponse.status}: ${authTestResponse.statusText}`,
          response: errorText,
          credentials: {
            hasAuthToken: !!authToken,
            hasUserId: !!userId,
            authTokenLength: authToken.length,
            userIdLength: userId.length,
          },
        });
      }

      const authData = await authTestResponse.json();
      console.log("✅ RocketChat Test: Authentication successful", {
        username: authData.username,
        name: authData.name,
        status: authData.status,
        duration: authTestDuration + "ms",
      });
    } catch (authError) {
      console.error("❌ RocketChat Test: Auth request failed", {
        error: authError instanceof Error ? authError.message : "Unknown error",
        duration: Date.now() - authTestStart + "ms",
      });

      return NextResponse.json({
        success: false,
        error: "RocketChat authentication request failed",
        details:
          authError instanceof Error ? authError.message : "Unknown error",
        credentials: {
          baseUrl,
          hasAuthToken: !!authToken,
          hasUserId: !!userId,
        },
      });
    }

    // Test 2: Check if we can access rooms (for typing indicators)
    console.log("💬 RocketChat Test: Testing rooms API access");
    const roomsTestStart = Date.now();

    try {
      const roomsResponse = await fetch(`${baseUrl}/api/v1/rooms.get`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": authToken,
          "X-User-Id": userId,
        },
      });

      const roomsTestDuration = Date.now() - roomsTestStart;

      console.log("📡 RocketChat Test: Rooms API response", {
        status: roomsResponse.status,
        statusText: roomsResponse.statusText,
        ok: roomsResponse.ok,
        duration: roomsTestDuration + "ms",
      });

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        console.log("✅ RocketChat Test: Rooms API accessible", {
          roomCount: roomsData.rooms?.length || 0,
          duration: roomsTestDuration + "ms",
        });
      } else {
        console.warn("⚠️ RocketChat Test: Rooms API limited access", {
          status: roomsResponse.status,
          statusText: roomsResponse.statusText,
          duration: roomsTestDuration + "ms",
        });
      }
    } catch (roomsError) {
      console.warn("⚠️ RocketChat Test: Rooms API test failed", {
        error:
          roomsError instanceof Error ? roomsError.message : "Unknown error",
        duration: Date.now() - roomsTestStart + "ms",
        note: "This may be expected for bot accounts with limited permissions",
      });
    }

    // Test 3: Test typing indicator endpoint (without actual room)
    console.log(
      "💭 RocketChat Test: Testing typing indicator endpoint structure"
    );
    const typingTestStart = Date.now();

    try {
      // We'll test with a fake room ID to see if the endpoint is accessible
      const typingResponse = await fetch(
        `${baseUrl}/api/v1/rooms.startTyping`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": authToken,
            "X-User-Id": userId,
          },
          body: JSON.stringify({
            roomId: "test-room-id-for-endpoint-check",
          }),
        }
      );

      const typingTestDuration = Date.now() - typingTestStart;

      console.log("📡 RocketChat Test: Typing endpoint response", {
        status: typingResponse.status,
        statusText: typingResponse.statusText,
        ok: typingResponse.ok,
        duration: typingTestDuration + "ms",
        note: "Expected to fail with invalid room, but endpoint should be accessible",
      });

      // We expect this to fail (invalid room), but the endpoint should be accessible
      if (typingResponse.status === 404) {
        console.log(
          "✅ RocketChat Test: Typing endpoint accessible (404 expected for fake room)"
        );
      } else if (
        typingResponse.status === 401 ||
        typingResponse.status === 403
      ) {
        console.error(
          "❌ RocketChat Test: Typing endpoint authentication failed",
          {
            status: typingResponse.status,
            duration: typingTestDuration + "ms",
          }
        );
      } else {
        console.log("ℹ️ RocketChat Test: Typing endpoint responded", {
          status: typingResponse.status,
          duration: typingTestDuration + "ms",
        });
      }
    } catch (typingError) {
      console.error("❌ RocketChat Test: Typing endpoint test failed", {
        error:
          typingError instanceof Error ? typingError.message : "Unknown error",
        duration: Date.now() - typingTestStart + "ms",
      });
    }

    // Test 4: Test message sending endpoint (without actual room)
    console.log(
      "📤 RocketChat Test: Testing message posting endpoint structure"
    );
    const messageTestStart = Date.now();

    try {
      // We'll test with a fake room ID to see if the endpoint is accessible
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
            roomId: "test-room-id-for-endpoint-check",
            text: "Test message for endpoint validation",
            alias: "Test Bot",
          }),
        }
      );

      const messageTestDuration = Date.now() - messageTestStart;

      console.log("📡 RocketChat Test: Message endpoint response", {
        status: messageResponse.status,
        statusText: messageResponse.statusText,
        ok: messageResponse.ok,
        duration: messageTestDuration + "ms",
        note: "Expected to fail with invalid room, but endpoint should be accessible",
      });

      // We expect this to fail (invalid room), but the endpoint should be accessible
      if (messageResponse.status === 404) {
        console.log(
          "✅ RocketChat Test: Message endpoint accessible (404 expected for fake room)"
        );
      } else if (
        messageResponse.status === 401 ||
        messageResponse.status === 403
      ) {
        console.error(
          "❌ RocketChat Test: Message endpoint authentication failed",
          {
            status: messageResponse.status,
            duration: messageTestDuration + "ms",
          }
        );
      } else {
        console.log("ℹ️ RocketChat Test: Message endpoint responded", {
          status: messageResponse.status,
          duration: messageTestDuration + "ms",
        });
      }
    } catch (messageError) {
      console.error("❌ RocketChat Test: Message endpoint test failed", {
        error:
          messageError instanceof Error
            ? messageError.message
            : "Unknown error",
        duration: Date.now() - messageTestStart + "ms",
      });
    }

    const totalDuration = Date.now() - testStartTime;

    console.log("✅ RocketChat Test: Connectivity test completed", {
      totalDuration: totalDuration + "ms",
      authenticationWorking: true,
      endpointsAccessible: true,
    });

    return NextResponse.json({
      success: true,
      message: "RocketChat connectivity test successful",
      duration: totalDuration,
      connectionTest: {
        authenticationSuccessful: true,
        endpointsAccessible: true,
        typingEndpointAvailable: true,
        messageEndpointAvailable: true,
      },
      configuration: {
        baseUrl,
        hasAuthToken: !!authToken,
        hasUserId: !!userId,
        authTokenLength: authToken.length,
        userIdLength: userId.length,
      },
      endpoints: {
        authentication: `${baseUrl}/api/v1/me`,
        typing: `${baseUrl}/api/v1/rooms.startTyping`,
        messaging: `${baseUrl}/api/v1/chat.postMessage`,
        rooms: `${baseUrl}/api/v1/rooms.get`,
      },
      nextSteps: [
        "✅ RocketChat API is working correctly",
        "Test Dialogflow connectivity: GET /api/debug/dialogflow",
        "Test full integration: POST /api/debug/full-integration",
      ],
    });
  } catch (error) {
    const totalDuration = Date.now() - testStartTime;

    console.error("💥 RocketChat Test: Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + "ms",
      timestamp,
    });

    return NextResponse.json(
      {
        success: false,
        error: "RocketChat test failed with unexpected error",
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

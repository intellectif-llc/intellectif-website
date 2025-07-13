import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the message details from the request body
    const { roomId, message, alias } = await request.json();

    if (!roomId || !message) {
      return NextResponse.json(
        { success: false, error: "roomId and message are required" },
        { status: 400 }
      );
    }

    // Get Rocket.Chat credentials
    const authToken = process.env.ROCKETCHAT_AUTH_TOKEN;
    const userId = process.env.ROCKETCHAT_USER_ID;

    if (!authToken || !userId) {
      console.error(
        "Rocket.Chat credentials are not set in environment variables"
      );
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
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
          alias: alias || "Intellectif Bot", // Default bot name
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Rocket.Chat API error:", errorText);
      return NextResponse.json(
        { success: false, error: "Failed to send message to Rocket.Chat" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      messageId: data.message?._id,
      timestamp: data.message?.ts,
    });
  } catch (error) {
    console.error("Error sending message to Rocket.Chat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message to Rocket.Chat" },
      { status: 500 }
    );
  }
}

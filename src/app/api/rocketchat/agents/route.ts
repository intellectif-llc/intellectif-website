import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // API Key Authentication
  const apiKey = request.headers.get("X-API-Key");
  const serverApiKey = process.env.CHECK_AGENT_AVAILABILITY_SECRET;

  if (!serverApiKey) {
    console.error("API secret key is not set in environment variables.");
    // Do not expose details about the internal error to the client.
    return NextResponse.json(
      { success: false, error: "Server configuration error." },
      { status: 500 }
    );
  }

  if (apiKey !== serverApiKey) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");

  const authToken = process.env.ROCKETCHAT_AUTH_TOKEN;
  const userId = process.env.ROCKETCHAT_USER_ID;

  // We will always use the general 'users/agent' endpoint as it provides the reliable 'statusLivechat'.
  const rocketChatUrl =
    "https://chat.intellectif.com/api/v1/livechat/users/agent";

  if (!authToken || !userId) {
    console.error(
      "Rocket.Chat API credentials are not set in environment variables."
    );
    return NextResponse.json(
      { success: false, error: "Server configuration error." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(rocketChatUrl, {
      method: "GET",
      headers: {
        "X-Auth-Token": authToken,
        "X-User-Id": userId,
        "Content-Type": "application/json",
      },
      // Using 'no-cache' to ensure we always get the latest agent status.
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        "Failed to fetch from Rocket.Chat API:",
        response.status,
        errorData
      );
      return NextResponse.json(
        { success: false, error: "Failed to fetch agent status." },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.users)) {
      console.error("Invalid response format from Rocket.Chat API:", data);
      return NextResponse.json(
        { success: false, error: "Unexpected response from Rocket.Chat API." },
        { status: 500 }
      );
    }

    // Per your feedback, we will now filter by the 'status' field.
    // We check for 'online' as this indicates the user is active on Rocket.Chat.
    let onlineAgents = data.users.filter(
      (agent: any) => agent.status === "online"
    );

    // If a departmentId is provided, further filter the online agents
    // to see who belongs to the specified department.
    if (departmentId) {
      onlineAgents = onlineAgents.filter((agent: any) =>
        agent.departments?.some(
          (dept: { departmentId: string }) => dept.departmentId === departmentId
        )
      );
    }

    const finalAgentList = onlineAgents.map((agent: any) => ({
      id: agent._id,
      name: agent.name,
      username: agent.username,
      status: agent.status,
    }));

    return NextResponse.json({
      success: true,
      available_agents: finalAgentList,
      count: finalAgentList.length,
    });
  } catch (error) {
    console.error("Error fetching Rocket.Chat agents:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

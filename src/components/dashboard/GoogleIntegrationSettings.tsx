"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

interface GoogleIntegrationSettingsProps {
  consultantId: string;
}

export default function GoogleIntegrationSettings({
  consultantId,
}: GoogleIntegrationSettingsProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check Google connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, [consultantId]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch("/api/auth/google/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consultantId }),
      });

      const data = await response.json();
      setIsConnected(data.status === "already_connected");
    } catch (error) {
      console.error("Failed to check Google connection status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);

      const response = await fetch("/api/auth/google/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consultantId }),
      });

      const data = await response.json();

      if (data.status === "already_connected") {
        setIsConnected(true);
        alert("Google account is already connected!");
      } else if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Failed to connect Google account:", error);
      alert("Failed to connect Google account. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect your Google account? This will disable automatic meeting creation."
      )
    ) {
      return;
    }

    try {
      setIsConnecting(true);

      // TODO: Implement disconnect API endpoint
      const response = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consultantId }),
      });

      if (response.ok) {
        setIsConnected(false);
        alert("Google account disconnected successfully.");
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect Google account:", error);
      alert("Failed to disconnect Google account. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Google Calendar Integration
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Checking connection status...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Google Calendar Integration
      </h3>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`}
            ></div>
            <div>
              <p className="font-medium text-gray-900">
                {isConnected ? "Connected to Google Calendar" : "Not Connected"}
              </p>
              <p className="text-sm text-gray-500">
                {isConnected
                  ? "Automatic Google Meet links will be created for new bookings"
                  : "Connect your Google account to automatically create Google Meet links"}
              </p>
            </div>
          </div>

          {isConnected ? (
            <Button
              onClick={handleDisconnectGoogle}
              disabled={isConnecting}
              variant="outline"
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            >
              {isConnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : (
            <Button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? "Connecting..." : "Connect Google"}
            </Button>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Benefits of Google Calendar Integration:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Automatic Google Meet link generation for each consultation
            </li>
            <li>• Calendar events synced to your Google Calendar</li>
            <li>• Professional meeting invitations sent to customers</li>
            <li>• Secure, unique meeting rooms for each session</li>
            <li>• Automatic reminders and notifications</li>
          </ul>
        </div>

        {/* Security Note */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            🔐 Security & Privacy:
          </h4>
          <p className="text-sm text-gray-700">
            We only access your calendar to create consultation events. Your
            Google account credentials are securely encrypted and stored. You
            can disconnect at any time.
          </p>
        </div>

        {/* Instructions */}
        {!isConnected && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">
              How to Connect:
            </h4>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Click "Connect Google" above</li>
              <li>Sign in to your Google account</li>
              <li>Grant calendar access permissions</li>
              <li>You'll be redirected back to this page</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

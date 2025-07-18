"use client";

import { useState } from "react";

interface TestResult {
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
}

export default function IntegrationDebugPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTest = async (
    testName: string,
    endpoint: string,
    method: string = "GET",
    body?: any
  ) => {
    setLoading((prev) => ({ ...prev, [testName]: true }));

    try {
      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      setResults((prev) => ({
        ...prev,
        [testName]: {
          success: response.ok && data.success !== false,
          duration,
          data,
          error: !response.ok ? `HTTP ${response.status}` : data.error,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [testName]: {
          success: false,
          duration: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [testName]: false }));
    }
  };

  const runAllTests = async () => {
    await runTest("environment", "/api/debug/environment");
    await runTest("dialogflow", "/api/debug/dialogflow");
    await runTest("rocketchat", "/api/debug/rocketchat");
    await runTest("fullIntegration", "/api/debug/full-integration", "POST", {
      message: "Hello, this is a test from the debug dashboard.",
    });
  };

  const getStatusIcon = (testName: string) => {
    if (loading[testName]) return "🔄";
    const result = results[testName];
    if (!result) return "⚪";
    return result.success ? "✅" : "❌";
  };

  const getStatusColor = (testName: string) => {
    if (loading[testName]) return "text-yellow-400";
    const result = results[testName];
    if (!result) return "text-gray-400";
    return result.success ? "text-green-400" : "text-red-400";
  };

  return (
    <div className="min-h-screen bg-[#051028] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            🔧 RocketChat + Dialogflow Integration Debug
          </h1>
          <p className="text-xl text-gray-300">
            Test and diagnose your integration components
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex justify-center gap-4 flex-wrap">
          <button
            onClick={runAllTests}
            disabled={Object.values(loading).some(Boolean)}
            className="bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] text-[#051028] px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            🚀 Run All Tests
          </button>

          <button
            onClick={() => setResults({})}
            className="bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors"
          >
            🧹 Clear Results
          </button>
        </div>

        {/* Test Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Environment Variables Test */}
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className={`text-2xl ${getStatusColor("environment")}`}>
                  {getStatusIcon("environment")}
                </span>
                Environment Variables
              </h3>
              <button
                onClick={() => runTest("environment", "/api/debug/environment")}
                disabled={loading.environment}
                className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-4 py-2 rounded-lg hover:bg-[#6bdcc0]/30 transition-colors disabled:opacity-50"
              >
                Test
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Checks all required environment variables for RocketChat and
              Dialogflow CX
            </p>

            {results.environment && (
              <div className="bg-[#051028] rounded-lg p-4 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Status:</span>
                  <span className={getStatusColor("environment")}>
                    {results.environment.success
                      ? "All variables present"
                      : "Issues found"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-[#6bdcc0]">
                    {results.environment.duration}ms
                  </span>
                </div>
                {results.environment.error && (
                  <div className="mt-2 text-red-400 text-xs">
                    {results.environment.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dialogflow CX Test */}
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className={`text-2xl ${getStatusColor("dialogflow")}`}>
                  {getStatusIcon("dialogflow")}
                </span>
                Dialogflow CX
              </h3>
              <button
                onClick={() => runTest("dialogflow", "/api/debug/dialogflow")}
                disabled={loading.dialogflow}
                className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-4 py-2 rounded-lg hover:bg-[#6bdcc0]/30 transition-colors disabled:opacity-50"
              >
                Test
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Tests authentication and connectivity to Dialogflow CX API
            </p>

            {results.dialogflow && (
              <div className="bg-[#051028] rounded-lg p-4 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Status:</span>
                  <span className={getStatusColor("dialogflow")}>
                    {results.dialogflow.success ? "Connected" : "Failed"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-[#6bdcc0]">
                    {results.dialogflow.duration}ms
                  </span>
                </div>
                {results.dialogflow.data?.testResponse && (
                  <div className="mt-2 text-green-400 text-xs">
                    Intent:{" "}
                    {results.dialogflow.data.testResponse.intent || "Default"}
                  </div>
                )}
                {results.dialogflow.error && (
                  <div className="mt-2 text-red-400 text-xs">
                    {results.dialogflow.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RocketChat API Test */}
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className={`text-2xl ${getStatusColor("rocketchat")}`}>
                  {getStatusIcon("rocketchat")}
                </span>
                RocketChat API
              </h3>
              <button
                onClick={() => runTest("rocketchat", "/api/debug/rocketchat")}
                disabled={loading.rocketchat}
                className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-4 py-2 rounded-lg hover:bg-[#6bdcc0]/30 transition-colors disabled:opacity-50"
              >
                Test
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Tests authentication and API endpoints for RocketChat
            </p>

            {results.rocketchat && (
              <div className="bg-[#051028] rounded-lg p-4 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Status:</span>
                  <span className={getStatusColor("rocketchat")}>
                    {results.rocketchat.success ? "Connected" : "Failed"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-[#6bdcc0]">
                    {results.rocketchat.duration}ms
                  </span>
                </div>
                {results.rocketchat.data?.connectionTest && (
                  <div className="mt-2 text-green-400 text-xs">
                    Auth:{" "}
                    {results.rocketchat.data.connectionTest
                      .authenticationSuccessful
                      ? "✅"
                      : "❌"}{" "}
                    Endpoints:{" "}
                    {results.rocketchat.data.connectionTest.endpointsAccessible
                      ? "✅"
                      : "❌"}
                  </div>
                )}
                {results.rocketchat.error && (
                  <div className="mt-2 text-red-400 text-xs">
                    {results.rocketchat.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Full Integration Test */}
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span
                  className={`text-2xl ${getStatusColor("fullIntegration")}`}
                >
                  {getStatusIcon("fullIntegration")}
                </span>
                Full Integration
              </h3>
              <button
                onClick={() =>
                  runTest(
                    "fullIntegration",
                    "/api/debug/full-integration",
                    "POST",
                    {
                      message:
                        "Hello, this is a test from the debug dashboard.",
                    }
                  )
                }
                disabled={loading.fullIntegration}
                className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-4 py-2 rounded-lg hover:bg-[#6bdcc0]/30 transition-colors disabled:opacity-50"
              >
                Test
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Comprehensive end-to-end test of the entire integration flow
            </p>

            {results.fullIntegration && (
              <div className="bg-[#051028] rounded-lg p-4 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Status:</span>
                  <span className={getStatusColor("fullIntegration")}>
                    {results.fullIntegration.success
                      ? "All tests passed"
                      : "Issues found"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-[#6bdcc0]">
                    {results.fullIntegration.duration}ms
                  </span>
                </div>
                {results.fullIntegration.data?.results?.errors?.length > 0 && (
                  <div className="mt-2 text-red-400 text-xs">
                    {results.fullIntegration.data.results.errors.length}{" "}
                    error(s) found
                  </div>
                )}
                {results.fullIntegration.error && (
                  <div className="mt-2 text-red-400 text-xs">
                    {results.fullIntegration.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results */}
        {Object.keys(results).length > 0 && (
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              📊 Detailed Results
            </h3>

            <div className="bg-[#051028] rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4">📝 Instructions</h3>

          <div className="space-y-4 text-gray-300">
            <div>
              <h4 className="font-semibold text-[#6bdcc0] mb-2">
                1. Environment Variables Test
              </h4>
              <p className="text-sm">
                Checks if all required environment variables are present and
                properly formatted.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#6bdcc0] mb-2">
                2. Dialogflow CX Test
              </h4>
              <p className="text-sm">
                Tests actual connectivity to Google's Dialogflow CX API using
                your credentials.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#6bdcc0] mb-2">
                3. RocketChat API Test
              </h4>
              <p className="text-sm">
                Tests authentication and endpoint accessibility for RocketChat
                API.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#6bdcc0] mb-2">
                4. Full Integration Test
              </h4>
              <p className="text-sm">
                Comprehensive test that validates the entire integration flow
                end-to-end.
              </p>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 font-semibold mb-2">
                🔍 Troubleshooting:
              </p>
              <ul className="text-sm space-y-1">
                <li>
                  • If environment test fails: Check AWS Amplify environment
                  variables
                </li>
                <li>
                  • If Dialogflow fails: Verify Google Cloud service account
                  credentials
                </li>
                <li>
                  • If RocketChat fails: Check bot user credentials and
                  permissions
                </li>
                <li>• Check CloudWatch logs for detailed error information</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-12 text-center">
          <a
            href="/dashboard"
            className="bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors inline-block"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

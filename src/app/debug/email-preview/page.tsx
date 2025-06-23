"use client";

import { useState } from "react";

export default function EmailPreviewPage() {
  const [template, setTemplate] = useState("booking-confirmation");
  const [format, setFormat] = useState("html");

  const previewUrl = `/api/debug/email-preview?template=${template}&format=${format}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            📧 Email Template Preview
          </h1>

          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="booking-confirmation">
                  Booking Confirmation
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="html">HTML</option>
                <option value="text">Plain Text</option>
              </select>
            </div>

            <div className="flex items-end">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Open in New Tab
              </a>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b">
              Preview ({format.toUpperCase()})
            </div>

            {format === "html" ? (
              <iframe
                src={previewUrl}
                className="w-full h-96 border-0"
                title="Email Preview"
              />
            ) : (
              <div className="p-4 bg-gray-50 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Email Preview Text"
                />
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">📝 How to Use</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Select the template and format you want to preview</li>
              <li>
                • The preview shows sample data - real emails will use actual
                booking data
              </li>
              <li>
                • Use &quot;Open in New Tab&quot; to see the full email in a
                separate window
              </li>
              <li>
                • HTML format shows the styled email, Text format shows the
                plain text version
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<any>(null);
  const [progress, setProgress] = useState<string>("");
  const [language, setLanguage] = useState("eng");

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setText("");
    setMetadata(null);
    setProgress("");

    const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement)
      ?.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress("Uploading PDF...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      setProgress("Processing PDF and extracting text...");
      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setText(data.text || "No text found");
        setMetadata(data.metadata);
        setProgress("✅ Extraction completed!");
      } else {
        setError(data.error || "Failed to extract text");
        setProgress("");
      }
    } catch (err: any) {
      setError("Failed to upload file: " + err.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const downloadText = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    alert("Text copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📄 PDF OCR Text Extractor
          </h1>
          <p className="text-gray-600">
            Extract text from PDF files using advanced OCR technology
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="eng">English</option>
                <option value="hin">Hindi (हिंदी)</option>
                <option value="eng+hin">English + Hindi</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF File
              </label>
              <input
                type="file"
                name="file"
                accept=".pdf"
                required
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "🚀 Extract Text"
              )}
            </button>
          </form>

          {/* Progress */}
          {progress && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 font-medium">{progress}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">❌ {error}</p>
            </div>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                📊 Document Info
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                <div>
                  <span className="font-medium">File:</span> {metadata.fileName}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {metadata.fileSize}
                </div>
                <div>
                  <span className="font-medium">Pages:</span> {metadata.totalPages}
                </div>
                <div>
                  <span className="font-medium">Language:</span> {metadata.language}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Extracted Text */}
        {text && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                📝 Extracted Text
              </h2>
              <div className="space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  📋 Copy
                </button>
                <button
                  onClick={downloadText}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  💾 Download
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {text}
              </pre>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Total characters: {text.length}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Built with Next.js, Tesseract.js, and pdf2pic</p>
          <p className="mt-1">
            Supports multiple languages including English and Hindi
          </p>
        </div>
      </div>
    </div>
  );
}
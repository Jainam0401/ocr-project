"use client";
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [language, setLanguage] = useState("eng");

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setText("");
    setMetadata(null);
    setProgress(0);
    setProgressMessage("");

    const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement)
      ?.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgressMessage("Uploading PDF...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      setProgress(10);
      setProgressMessage("Processing PDF...");

      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setProgress(100);
        setText(data.text || "No text found");
        setMetadata(data.metadata);
        setProgressMessage("Extraction completed successfully");
      } else {
        setError(data.error || "Failed to extract text");
        setProgress(0);
        setProgressMessage("");
      }
    } catch (err: any) {
      setError("Failed to upload file: " + err.message);
      setProgress(0);
      setProgressMessage("");
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
    alert("Text copied to clipboard.");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">PDF OCR Text Extractor</h1>
          <p className="text-gray-600">Extract text from PDFs using OCR</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="eng">English</option>
                <option value="hin">Hindi</option>
                
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF File</label>
              <input
                type="file"
                name="file"
                accept=".pdf"
                required
                disabled={loading}
                className="w-full text-black px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : "Extract Text"}
            </button>
          </form>

          {progress > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-700">{progressMessage}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {metadata && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Document Info</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                <div>File: {metadata.fileName}</div>
                <div>Size: {metadata.fileSize}</div>
                <div>Pages: {metadata.totalPages}</div>
                <div>Language: {metadata.language}</div>
              </div>
            </div>
          )}
        </div>

        {text && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Extracted Text</h2>
              <div className="space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  Copy
                </button>
                <button
                  onClick={downloadText}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
                >
                  Download
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{text}</pre>
            </div>
            <div className="mt-4 text-sm text-gray-600">Total characters: {text.length}</div>
          </div>
        )}
      </div>
    </div>
  );
}

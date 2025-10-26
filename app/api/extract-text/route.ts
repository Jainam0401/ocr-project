export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";
import { v4 as uuidv4 } from "uuid";
import tesseract from "node-tesseract-ocr";
import pLimit from "p-limit";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const execAsync = util.promisify(exec);

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  let pdfPath: string | null = null;
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const language = (formData.get("language") as string) || "eng";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF files are supported" }, { status: 400 });
    }

    // Temporary directory
    const uniqueId = uuidv4();
    tempDir = path.join(process.cwd(), "temp", uniqueId);
    await fs.mkdir(tempDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    pdfPath = path.join(tempDir, `${uniqueId}.pdf`);
    await fs.writeFile(pdfPath, buffer);

    console.log(`Uploaded: ${file.name} (${(buffer.length / 1024).toFixed(2)} KB)`);

    const pdfLib = await import("pdf-lib");
    const pdfDoc = await pdfLib.PDFDocument.load(buffer);
    const totalPages = pdfDoc.getPageCount();
    console.log(`Total pages: ${totalPages}`);

    console.log("Converting PDF to images...");
    await execAsync(`pdftoppm "${pdfPath}" "${path.join(tempDir, "page")}" -png -r 200`);
    console.log("Conversion done");

    const config = { lang: language, oem: 1, psm: 3 };
    const limit = pLimit(3);
    const ocrTasks: Promise<string>[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const imagePath = path.join(tempDir, `page-${pageNum}.png`);

      ocrTasks.push(
        limit(async () => {
          console.log(`Running OCR on page ${pageNum}/${totalPages}`);
          try {
            const text = await tesseract.recognize(imagePath, config);
            return `\n\n--- Page ${pageNum} ---\n${text}`;
          } catch (err: any) {
            console.error(`OCR failed on page ${pageNum}: ${err.message}`);
            return `\n\n--- Page ${pageNum} ---\n[Error: ${err.message}]`;
          }
        })
      );
    }

    const results = await Promise.allSettled(ocrTasks);
    const extractedText = results
      .map((r, i) => (r.status === "fulfilled" ? r.value : `--- Page ${i + 1} --- [Error]`))
      .join("\n");

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`OCR completed in ${totalTime}s`);
     if (tempDir) {
      (async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
          console.log(`Temporary folder deleted: ${tempDir}`);
        } catch (cleanupError: any) {
          console.error("Cleanup error:", cleanupError.message);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      text: extractedText.trim(),
      metadata: {
        fileName: file.name,
        fileSize: `${(buffer.length / 1024).toFixed(2)} KB`,
        totalPages,
        language,
        processingTime: `${totalTime}s`,
        concurrency: 3,
        dpi: 200,
      },
    });
  } catch (error: any) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch((e) =>
        console.error("Cleanup error:", e.message)
      );
    }
  }
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "/api/extract-text",
    methods: ["POST"],
    description: "PDF to text OCR extraction API",
  });
}

// app/api/extract-text/route.ts
export const runtime = "nodejs"; // Ensure full Node.js runtime

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { fromPath } from "pdf2pic";
import { v4 as uuidv4 } from "uuid";
import tesseract from "node-tesseract-ocr";

export const maxDuration = 300; // 5 minutes max
export const dynamic = "force-dynamic";

interface OCRProgress {
  currentPage: number;
  totalPages: number;
  status: string;
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  let pdfPath: string | null = null;
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const language = (formData.get("language") as string) || "eng";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Create unique temp directory
    const uniqueId = uuidv4();
    tempDir = path.join(process.cwd(), "temp", uniqueId);
    await fs.mkdir(tempDir, { recursive: true });

    // Save uploaded PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    pdfPath = path.join(tempDir, `${uniqueId}.pdf`);
    await fs.writeFile(pdfPath, buffer);

    console.log(`📄 Uploaded: ${file.name} (${(buffer.length / 1024).toFixed(2)} KB)`);

    // Get page count using pdf-lib
    const pdfLib = await import("pdf-lib");
    const pdfDoc = await pdfLib.PDFDocument.load(buffer);
    const totalPages = pdfDoc.getPageCount();
    console.log(`📊 Total pages: ${totalPages}`);

    // Initialize pdf2pic converter
    const convert = fromPath(pdfPath, {
      density: 300,
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 2480,
      height: 3508,
    });

    // OCR config
    const config = {
      lang: language,
      oem: 1,
      psm: 3,
    };

    let extractedText = "";
    const progress: OCRProgress[] = [];

    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`\n📄 Converting page ${pageNum}/${totalPages} to image...`);
        await convert(pageNum, { responseType: "image" });

        const files = await fs.readdir(tempDir);
        const imageName = files.find(
          (f) => f.includes(`page.${pageNum}`) && f.endsWith(".png")
        );

        if (!imageName) {
          console.error(`❌ Image not found for page ${pageNum}`);
          extractedText += `\n\n--- Page ${pageNum} ---\n[Conversion Error]\n`;
          continue;
        }

        const imagePath = path.join(tempDir, imageName);
        console.log(`🔍 Running OCR on page ${pageNum}...`);

        const text = await tesseract.recognize(imagePath, config);
        extractedText += `\n\n--- Page ${pageNum} ---\n${text}`;

        progress.push({
          currentPage: pageNum,
          totalPages,
          status: `Completed page ${pageNum}`,
        });

        console.log(`✅ Page ${pageNum} OCR done`);
      } catch (err: any) {
        console.error(`❌ OCR failed on page ${pageNum}:`, err.message);
        extractedText += `\n\n--- Page ${pageNum} ---\n[Error: ${err.message}]\n`;
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✨ OCR extraction completed in ${totalTime}s`);

    return NextResponse.json({
      success: true,
      text: extractedText.trim(),
      metadata: {
        fileName: file.name,
        fileSize: `${(buffer.length / 1024).toFixed(2)} KB`,
        totalPages,
        language,
        processingTime: `${totalTime}s`,
      },
      progress,
    });
  } catch (error: any) {
    console.error("❌ Error processing PDF:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process PDF",
        details: error.stack,
      },
      { status: 500 }
    );
  } finally {
    // Cleanup
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log("🧹 Cleaned up temp files");
      } catch (cleanupError: any) {
        console.error("⚠️ Cleanup error:", cleanupError.message);
      }
    }
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "/api/extract-text",
    methods: ["POST"],
    description: "OCR API for PDF text extraction (using node-tesseract-ocr)",
  });
}

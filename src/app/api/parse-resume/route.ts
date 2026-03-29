import { NextRequest, NextResponse } from "next/server";
import { parsePDF } from "@/lib/pdfParser";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Buffer size:", buffer.length); // 👈 IMPORTANT

    if (buffer.length === 0) {
      throw new Error("Empty file buffer");
    }

    const text = await parsePDF(buffer);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Error parsing resume" },
      { status: 500 }
    );
  }
}
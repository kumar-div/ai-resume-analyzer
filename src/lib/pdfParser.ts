const pdf = require("pdf-parse-fixed");

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    console.log("Buffer size:", buffer.length);

    const data = await pdf(buffer);

    console.log("Parsed text length:", data.text?.length);

    return data.text || "";
  } catch (error) {
    console.error("PDF Parse Error FULL:", error);
    throw new Error("Failed to parse PDF");
  }
}
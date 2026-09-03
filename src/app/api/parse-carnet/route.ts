import { NextRequest, NextResponse } from "next/server";
import { parseVoucherText } from "@/lib/pdf-parser";
import JSZip from "jszip";
import pdfParse from "pdf-parse";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Nessun file caricato." },
        { status: 400 }
      );
    }

    const pdfBuffers: { filename: string; buffer: Buffer }[] = [];

    // Process all files (handle both direct PDFs and ZIP archives)
    for (const file of files) {
      const filename = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (filename.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(buffer);
        for (const [relPath, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir && relPath.toLowerCase().endsWith(".pdf")) {
            const entryBuffer = await zipEntry.async("nodebuffer");
            const entryFilename = relPath.split("/").pop() || relPath;
            pdfBuffers.push({ filename: entryFilename, buffer: entryBuffer });
          }
        }
      } else if (filename.endsWith(".pdf")) {
        pdfBuffers.push({ filename: file.name, buffer });
      }
    }

    if (pdfBuffers.length === 0) {
      return NextResponse.json(
        { error: "Nessun file PDF valido trovato nei file o nell'archivio ZIP caricato." },
        { status: 400 }
      );
    }

    // Parse each PDF
    const parsedTickets = [];
    let idCounter = 1;

    for (const item of pdfBuffers) {
      try {
        const pdfData = await pdfParse(item.buffer);
        const extracted = parseVoucherText(pdfData.text);

        const isValid = Boolean(extracted.code && extracted.pin && extracted.expirationDate);

        parsedTickets.push({
          id: `ticket-${idCounter++}`,
          filename: item.filename,
          code: extracted.code || "NON RILEVATO",
          pin: extracted.pin || "NON RILEVATO",
          expirationDate: extracted.expirationDate || "",
          rawExpirationDate: extracted.rawExpirationDate || "",
          circuit: extracted.circuit || "The Space Cinema",
          sfCode: extracted.sfCode || "",
          beneficiary: extracted.beneficiary || "",
          isValid,
          errorMessage: isValid ? undefined : "Codice o PIN o Scadenza non estratti automaticamente.",
        });
      } catch (err: any) {
        parsedTickets.push({
          id: `ticket-${idCounter++}`,
          filename: item.filename,
          code: "",
          pin: "",
          expirationDate: "",
          circuit: "The Space Cinema",
          isValid: false,
          errorMessage: "Errore durante la lettura del file PDF: " + (err.message || "file corrotto"),
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalFiles: pdfBuffers.length,
      tickets: parsedTickets,
    });
  } catch (error: any) {
    console.error("Errore nell'elaborazione dei carnet:", error);
    return NextResponse.json(
      { error: "Errore interno del server durante l'elaborazione dei file: " + error.message },
      { status: 500 }
    );
  }
}

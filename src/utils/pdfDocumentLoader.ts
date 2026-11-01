import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite asset URL import for the PDF.js worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { paginateDocumentContent } from './accountabilityEngine';

try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
} catch {
  // Ignore worker configuration error in non-browser test runners
}

export interface ParsedStudyDocument {
  mimeType: string;
  fileDataUrl: string;
  contentPreview: string;
  pages: string[];
  pageImages: string[];
}

/**
 * Renders a crisp printable PDF page image onto an offscreen canvas for text/worksheet pages
 * so every document has both a visual printable PDF page and selectable text.
 */
export function renderTextPageToDataUrl(
  docName: string,
  pageNumber: number,
  totalPages: number,
  pageText: string
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 980;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean paper background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top header rule
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, 58);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 58);
  ctx.lineTo(canvas.width, 58);
  ctx.stroke();

  // Header metadata
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText(`VANGUARD 11 STUDY SHEET · ${docName.slice(0, 44)}`, 28, 35);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText(`Page ${pageNumber} of ${totalPages}`, canvas.width - 130, 35);

  // Body text word-wrapping
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  const maxWidth = canvas.width - 56;
  const lineHeight = 24;
  let y = 94;

  const rawLines = pageText.split('\n');
  for (const rawLine of rawLines) {
    if (y > canvas.height - 45) break;
    const trimmed = rawLine.trimEnd();
    if (!trimmed) {
      y += 14;
      continue;
    }

    const words = trimmed.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        ctx.fillText(currentLine, 28, y);
        currentLine = word;
        y += lineHeight;
        if (y > canvas.height - 45) break;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine && y <= canvas.height - 45) {
      ctx.fillText(currentLine, 28, y);
      y += lineHeight;
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Fallback binary PDF stream parser in case a PDF has raw text blocks and worker is unavailable.
 */
export function extractFallbackPdfStreamText(bytes: Uint8Array): string[] {
  try {
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(bytes);
    const matches: string[] = [];

    // Extract parenthesized literal strings inside PDF text objects
    const literalRegex = /\(([^()\\]{2,200})\)/g;
    let match: RegExpExecArray | null;
    while ((match = literalRegex.exec(raw)) !== null) {
      const cleaned = match[1].replace(/[^\x20-\x7E]/g, ' ').trim();
      if (cleaned.length >= 2 && !/^(Identity|Adobe|WinAnsiEncoding|BaseFont|Type|Subtype)$/i.test(cleaned)) {
        matches.push(cleaned);
      }
    }

    if (matches.length > 0) {
      const combined = matches.join(' ');
      return paginateDocumentContent(combined, 'Uploaded PDF');
    }
  } catch {
    // Ignore fallback decode errors
  }
  return [];
}

/**
 * Converts an ArrayBuffer to a base64 string for server-side multimodal OCR/extraction fallback.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Requests server-side Gemini multimodal PDF/image extraction for scanned PDFs or images.
 */
export async function extractDocumentContentViaServer(
  base64Data: string,
  mimeType: string,
  fileName: string
): Promise<string[]> {
  try {
    const response = await fetch('/api/pdf/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType,
        fileName,
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data.pages) && data.pages.length > 0) {
      return data.pages;
    }
  } catch {
    // Ignore network/server fallback errors
  }
  return [];
}

/**
 * Parses any uploaded File (.pdf, .png/.jpg, .txt/.md/.cpp/.py) into visual page images + extracted page text.
 */
export async function parseUploadedStudyFile(file: File): Promise<ParsedStudyDocument> {
  const objectUrl = URL.createObjectURL(file);
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isImage =
    file.type.startsWith('image/') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp');

  const mimeType = isPdf
    ? 'application/pdf'
    : isImage
    ? file.type || 'image/png'
    : file.type || 'text/plain';

  // 1. Handle real PDF files using pdfjs-dist + canvas page renderer + server OCR fallback
  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const extractedPages: string[] = [];
    const renderedImages: string[] = [];

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });
      const pdfDoc = await loadingTask.promise;
      const numPages = Math.min(pdfDoc.numPages, 35);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        // A. Extract structured text content from the page
        const textContent = await page.getTextContent();
        const items = textContent.items as Array<any>;
        let pageText = '';
        let lastY: number | null = null;

        for (const item of items) {
          if (typeof item.str !== 'string') continue;
          const currentY = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 6) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
            pageText += ' ';
          }
          pageText += item.str;
          if (currentY !== null) {
            lastY = currentY;
          }
        }

        const cleanedPageText = pageText.trim();
        extractedPages.push(
          cleanedPageText ||
            `[Page ${pageNum} of ${file.name} — Scanned/Visual PDF Page Rendered Above. Click "Extract / OCR Page Text" if you want full text transcription.]`
        );

        // B. Render the visual PDF page onto a high-DPI HTML5 canvas
        if (typeof document !== 'undefined') {
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({
              canvasContext: ctx,
              viewport,
              canvas,
            } as any).promise;
            renderedImages.push(canvas.toDataURL('image/png'));
          }
        }
      }
    } catch {
      // Fallback if pdfjs encounters an unusual stream
      const fallbackStreamPages = extractFallbackPdfStreamText(new Uint8Array(arrayBuffer));
      if (fallbackStreamPages.length > 0) {
        extractedPages.push(...fallbackStreamPages);
      }
    }

    // Check if the PDF had almost no selectable text (e.g. a scanned PDF) or failed client parse
    const hasMeaningfulText = extractedPages.some(
      (p) => p.length > 20 && !p.startsWith('[Page ')
    );

    if (!hasMeaningfulText && arrayBuffer.byteLength < 12 * 1024 * 1024) {
      const base64Pdf = arrayBufferToBase64(arrayBuffer);
      const serverPages = await extractDocumentContentViaServer(
        base64Pdf,
        'application/pdf',
        file.name
      );
      if (serverPages.length > 0) {
        extractedPages.splice(0, extractedPages.length, ...serverPages);
      }
    }

    if (extractedPages.length === 0) {
      extractedPages.push(
        `Document "${file.name}" loaded (${Math.max(1, Math.round(file.size / 1024))} KB).`
      );
    }

    // If visual canvas rendering wasn't possible for any page, synthesize crisp visual page sheets
    if (renderedImages.length === 0) {
      extractedPages.forEach((pText, idx) => {
        renderedImages.push(
          renderTextPageToDataUrl(file.name, idx + 1, extractedPages.length, pText)
        );
      });
    }

    return {
      mimeType: 'application/pdf',
      fileDataUrl: objectUrl,
      contentPreview: extractedPages.join('\n\n--- NEXT PAGE ---\n\n').slice(0, 8000),
      pages: extractedPages,
      pageImages: renderedImages,
    };
  }

  // 2. Handle Image files (.png, .jpg, .jpeg, .webp)
  if (isImage) {
    const arrayBuffer = await file.arrayBuffer();
    const base64Img = arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:${mimeType};base64,${base64Img}`;
    let ocrPages = await extractDocumentContentViaServer(base64Img, mimeType, file.name);
    if (ocrPages.length === 0) {
      ocrPages = [
        `Image Worksheet: ${file.name}\nVisual diagram / problem photo is displayed above. Use the Zoom, Highlighter, and Pen tools to mark up the image directly.`,
      ];
    }
    return {
      mimeType,
      fileDataUrl: dataUrl,
      contentPreview: ocrPages.join('\n\n'),
      pages: ocrPages,
      pageImages: [dataUrl],
    };
  }

  // 3. Handle Text, Markdown, Code, CSV, JSON, or general files
  const rawText = await file.text();
  const textContent = rawText.trim() || `Empty file: ${file.name}`;
  const pages = paginateDocumentContent(textContent, file.name);
  const pageImages = pages.map((pText, idx) =>
    renderTextPageToDataUrl(file.name, idx + 1, pages.length, pText)
  );

  return {
    mimeType,
    fileDataUrl: objectUrl,
    contentPreview: textContent.slice(0, 8000),
    pages,
    pageImages,
  };
}

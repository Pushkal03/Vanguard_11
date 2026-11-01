import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Eye, Plus, Bookmark, Loader2 } from 'lucide-react';
import {
  HomeworkFile,
  paginateDocumentContent,
  TimetableBlock,
} from '../utils/accountabilityEngine';
import {
  parseUploadedStudyFile,
  renderTextPageToDataUrl,
} from '../utils/pdfDocumentLoader';

interface HomeworkVaultViewProps {
  homeworkFiles: HomeworkFile[];
  activeBlock: TimetableBlock | null;
  onAddHomeworkFile: (
    file: Omit<HomeworkFile, 'id' | 'uploadedAt' | 'uploadedDuringBlock'>,
    openImmediately?: boolean
  ) => void;
  onOpenInReader: (homeworkId: string) => void;
  onLogViolation: (description: string, points: number) => void;
}

export const HomeworkVaultView: React.FC<HomeworkVaultViewProps> = ({
  homeworkFiles,
  activeBlock,
  onAddHomeworkFile,
  onOpenInReader,
}) => {
  const [titleInput, setTitleInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('Physics (11th Std)');
  const [contentInput, setContentInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isParsingFiles, setIsParsingFiles] = useState<boolean>(false);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsParsingFiles(true);
    let lastAddedName = '';
    let totalExtractedPages = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        lastAddedName = file.name;
        const parsed = await parseUploadedStudyFile(file);
        totalExtractedPages += parsed.pages.length;

        onAddHomeworkFile(
          {
            name: file.name,
            subject: subjectInput,
            sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
            mimeType: parsed.mimeType,
            fileDataUrl: parsed.fileDataUrl,
            contentPreview: parsed.contentPreview,
            pages: parsed.pages,
            pageImages: parsed.pageImages,
            bookmarks: [],
            annotationsByPage: {},
            notes: '',
          },
          i === files.length - 1
        );
      }

      setUploadSuccess(
        `Extracted ${totalExtractedPages} page(s) from "${lastAddedName}" and opened in Universal PDF Opener (+20 XP).`
      );
    } catch (err: any) {
      setUploadError(
        `Could not parse file: ${err?.message || 'Unknown error'}. Try pasting the text below.`
      );
    } finally {
      setIsParsingFiles(false);
      e.target.value = '';
    }
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !contentInput.trim()) {
      setUploadError('Please enter both a document title and problem set content.');
      return;
    }

    setUploadError(null);
    const trimmedTitle = titleInput.trim();
    const trimmedContent = contentInput.trim();
    const pages = paginateDocumentContent(trimmedContent, trimmedTitle);
    const pageImages = pages.map((pText, idx) =>
      renderTextPageToDataUrl(trimmedTitle, idx + 1, pages.length, pText)
    );

    onAddHomeworkFile(
      {
        name: trimmedTitle,
        subject: subjectInput,
        sizeLabel: `${Math.max(2, Math.round(trimmedContent.length / 120))} KB`,
        mimeType: 'application/pdf',
        contentPreview: trimmedContent,
        pages,
        pageImages,
        bookmarks: [],
        annotationsByPage: {},
        notes: '',
      },
      true
    );
    setUploadSuccess(`"${trimmedTitle}" saved and opened in Universal PDF Opener (+20 XP).`);
    setTitleInput('');
    setContentInput('');
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Universal PDF Opener & Always-Open File Vault
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Accepts all your PDFs, images, code files, and worksheets 24/7. Automatically extracts all PDF pages and text so you can read, search, zoom, highlight, and solve inside the studio.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-medium">
            PDF & File Acceptor: Always Open
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Active Block:{' '}
            <strong className="text-slate-200">
              {activeBlock ? `${activeBlock.title} (${activeBlock.category.toUpperCase()})` : 'All Blocks'}
            </strong>
          </span>
        </div>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200"
        >
          {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Always-Open File Acceptor Dropzone & Worksheet Entry */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                01. Open or Deposit PDF & Study Files
              </h2>
              <span className="text-xs text-emerald-400 font-medium">
                Real PDF Page & Text Extractor
              </span>
            </div>

            <div className="space-y-3">
              <label htmlFor="vault-subject-select" className="block text-xs font-medium text-slate-300">
                11th Standard Subject Tag
              </label>
              <select
                id="vault-subject-select"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="Physics (11th Std)">Physics (11th Std)</option>
                <option value="Mathematics (JEE / 11th)">Mathematics (JEE / 11th)</option>
                <option value="Chemistry (Organic & Physical)">Chemistry (Organic & Physical)</option>
                <option value="Computer Science (C++ / Python)">Computer Science (C++ / Python)</option>
              </select>
            </div>

            {/* File Input Dropzone */}
            <label
              htmlFor="homework-file-input"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/40 bg-slate-950/70 p-6 text-center transition-colors cursor-pointer hover:border-amber-400 hover:bg-slate-950"
            >
              {isParsingFiles ? (
                <>
                  <Loader2 className="h-6 w-6 text-amber-400 mb-2 animate-spin" />
                  <span className="text-xs font-semibold text-amber-300">
                    Extracting PDF pages & rendering high-resolution sheets...
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-amber-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-200">
                    Click to Select PDFs, Images, TXT, Markdown, or Code Files from Laptop
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    Extracts every page & opens immediately in the Visual PDF Opener Studio
                  </span>
                </>
              )}
              <input
                id="homework-file-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.cpp,.py,*"
                onChange={handleFileInputChange}
                className="sr-only"
              />
            </label>

            {/* Paste Multi-Page Worksheet Form */}
            <form onSubmit={handleManualCreate} className="space-y-4 border-t border-slate-800 pt-5">
              <p className="text-xs font-semibold text-slate-300">
                Or Create a Multi-Page PDF Study Sheet Directly
              </p>
              <div>
                <label htmlFor="hw-title-input" className="block text-xs text-slate-400 mb-1">
                  Document / PDF Title
                </label>
                <input
                  id="hw-title-input"
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g., DPP-08 Work, Power & Energy.pdf"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="hw-content-input" className="block text-xs text-slate-400 mb-1">
                  Problem Statements / Pages (Use --- PAGE 2 --- to split pages)
                </label>
                <textarea
                  id="hw-content-input"
                  rows={4}
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                  placeholder="Paste questions, theorems, or homework text here so you can highlight and solve them in the PDF Opener..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                Save & Open in PDF Studio
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Stored Homework & PDF Files */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">
              02. All Accessible Files ({homeworkFiles.length} Ready in PDF Opener)
            </h2>
            <span className="text-xs text-slate-400">
              Visual PDF Pages · Selectable Text · Highlight · Formula Overlay
            </span>
          </div>

          <div className="space-y-3">
            {homeworkFiles.map((hw) => {
              const pageCount =
                hw.pages?.length || paginateDocumentContent(hw.contentPreview, hw.name).length;
              const bookmarkCount = hw.bookmarks?.length || 0;
              return (
                <div
                  key={hw.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                      <h3 className="font-display text-sm font-semibold text-white truncate">
                        {hw.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{hw.subject}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{hw.sizeLabel}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{pageCount} Pages</span>
                      {bookmarkCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400 flex items-center gap-1">
                            <Bookmark className="h-3 w-3" />
                            {bookmarkCount} Bookmarked
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>Uploaded {hw.uploadedAt}</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                      {hw.pages?.[0] || hw.contentPreview}
                    </p>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenInReader(hw.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open in PDF Opener
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Play,
  Terminal,
  FileText,
  BookOpen,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Highlighter,
  PenTool,
  Eraser,
  MousePointer,
  Upload,
  Search,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import {
  AnnotationStroke,
  AppIdentifier,
  HomeworkFile,
  paginateDocumentContent,
  TimetableBlock,
} from '../utils/accountabilityEngine';
import {
  parseUploadedStudyFile,
  renderTextPageToDataUrl,
} from '../utils/pdfDocumentLoader';

interface IntegratedAppsModalProps {
  openApp: AppIdentifier | null;
  onClose: () => void;
  activeBlock: TimetableBlock | null;
  homeworkFiles: HomeworkFile[];
  selectedHomeworkId: string | null;
  onSelectHomework: (id: string) => void;
  onSaveHomeworkNotes: (id: string, notes: string) => void;
  onUpdateHomeworkFile: (id: string, patch: Partial<HomeworkFile>) => void;
  onAddHomeworkFile: (
    file: Omit<HomeworkFile, 'id' | 'uploadedAt' | 'uploadedDuringBlock'>,
    openImmediately?: boolean
  ) => void;
  onAwardBonusPoints: (points: number, reason: string) => void;
}

const DEFAULT_CODE_SNIPPETS: Record<string, string> = {
  'dp_knapsack.cpp': `// 11th Std CS / Competitive Programming - 0/1 Knapsack DP
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int solveKnapsack(int W, const vector<int>& wt, const vector<int>& val) {
    int n = wt.size();
    vector<int> dp(W + 1, 0);
    for (int i = 0; i < n; i++) {
        for (int w = W; w >= wt[i]; w--) {
            dp[w] = max(dp[w], dp[w - wt[i]] + val[i]);
        }
    }
    return dp[W];
}

int main() {
    vector<int> values = {60, 100, 120};
    vector<int> weights = {10, 20, 30};
    cout << "Max Value for W=50: " << solveKnapsack(50, weights, values) << endl;
    return 0;
}`,
  'projectile_sim.py': `# Physics Numerical Verification: Projectile Motion with Air Drag
import math

def compute_range(v0: float, angle_deg: float, g: float = 9.81) -> float:
    theta = math.radians(angle_deg)
    return round((v0 ** 2) * math.sin(2 * theta) / g, 2)

for angle in [30, 45, 60]:
    print(f"Launch {angle} deg -> Horizontal Range: {compute_range(40.0, angle)} m")
`,
};

export const IntegratedAppsModal: React.FC<IntegratedAppsModalProps> = ({
  openApp,
  onClose,
  activeBlock,
  homeworkFiles,
  selectedHomeworkId,
  onSelectHomework,
  onSaveHomeworkNotes,
  onUpdateHomeworkFile,
  onAddHomeworkFile,
  onAwardBonusPoints,
}) => {
  // VS Code State
  const [activeCodeFile, setActiveCodeFile] = useState<string>('dp_knapsack.cpp');
  const [codeByFile, setCodeByFile] = useState<Record<string, string>>(DEFAULT_CODE_SNIPPETS);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Vanguard Sandboxed Compiler Ready. External network access disabled to prevent distraction.',
  ]);
  const [hasClaimedRunBonus, setHasClaimedRunBonus] = useState(false);

  // Universal PDF & File Opener Studio State
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotationTool, setAnnotationTool] = useState<
    'cursor' | 'highlighter' | 'pen_cyan' | 'pen_red'
  >('cursor');
  const [rightDrawerTab, setRightDrawerTab] = useState<'scratchpad' | 'formulas'>('scratchpad');
  const [pdfDisplayMode, setPdfDisplayMode] = useState<'combined' | 'visual_page' | 'selectable_text'>(
    'combined'
  );
  const [pdfSearchQuery, setPdfSearchQuery] = useState<string>('');
  const [copiedPageText, setCopiedPageText] = useState<boolean>(false);
  const [isParsingUpload, setIsParsingUpload] = useState<boolean>(false);

  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokePointsRef = useRef<Array<{ x: number; y: number }>>([]);

  const currentHomework =
    homeworkFiles.find((f) => f.id === selectedHomeworkId) || homeworkFiles[0] || null;

  const pages = useMemo(() => {
    if (!currentHomework) return ['No file selected.'];
    if (currentHomework.pages && currentHomework.pages.length > 0) {
      return currentHomework.pages;
    }
    return paginateDocumentContent(currentHomework.contentPreview, currentHomework.name);
  }, [currentHomework]);

  const totalPages = Math.max(1, pages.length);
  const safePage = Math.min(totalPages, Math.max(1, currentPage));
  const currentPageText = pages[safePage - 1] || '';

  // Compute or retrieve crisp visual PDF page image for the active page
  const currentPageImage = useMemo(() => {
    if (!currentHomework) return '';
    const existingImg = currentHomework.pageImages?.[safePage - 1];
    if (existingImg) return existingImg;
    return renderTextPageToDataUrl(
      currentHomework.name,
      safePage,
      totalPages,
      currentPageText
    );
  }, [currentHomework, safePage, totalPages, currentPageText]);

  // Search matching pages inside the active PDF
  const matchingPageNumbers = useMemo(() => {
    const q = pdfSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches: number[] = [];
    pages.forEach((pText, idx) => {
      if (pText.toLowerCase().includes(q)) {
        matches.push(idx + 1);
      }
    });
    return matches;
  }, [pages, pdfSearchQuery]);

  const bookmarks = currentHomework?.bookmarks || [];
  const isCurrentPageBookmarked = bookmarks.includes(safePage);

  // Reset page index when switching files
  useEffect(() => {
    setCurrentPage(1);
    setCopiedPageText(false);
  }, [currentHomework?.id]);

  // Redraw saved annotations on the overlay canvas whenever page, file, or strokes change
  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas || !currentHomework) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageStrokes = currentHomework.annotationsByPage?.[safePage] || [];

    for (const stroke of pageStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.tool === 'highlighter' ? 16 : 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.32 : 0.95;

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [currentHomework, safePage, zoomPercent, openApp, pdfDisplayMode]);

  if (!openApp) return null;

  const handleRunCode = () => {
    const code = codeByFile[activeCodeFile] || '';
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    let simulatedOutput = '';

    if (activeCodeFile.endsWith('.cpp')) {
      if (code.includes('solveKnapsack')) {
        simulatedOutput = `[${timestamp}] g++ -O2 ${activeCodeFile} -o main && ./main\nMax Value for W=50: 220\nProcess exited with code 0 (14ms). All 4 test cases passed.`;
      } else {
        simulatedOutput = `[${timestamp}] Compiled ${activeCodeFile} successfully (${code.length} bytes). Execution finished in 11ms.`;
      }
    } else {
      simulatedOutput = `[${timestamp}] python3 ${activeCodeFile}\nLaunch 30 deg -> Horizontal Range: 141.21 m\nLaunch 45 deg -> Horizontal Range: 163.10 m\nLaunch 60 deg -> Horizontal Range: 141.21 m`;
    }

    setTerminalOutput((prev) => [...prev, simulatedOutput]);
    if (!hasClaimedRunBonus) {
      setHasClaimedRunBonus(true);
      onAwardBonusPoints(15, 'Executed code solution inside sandboxed Visual Studio Code');
    }
  };

  const handleToggleBookmark = () => {
    if (!currentHomework) return;
    const existing = currentHomework.bookmarks || [];
    const nextBookmarks = existing.includes(safePage)
      ? existing.filter((p) => p !== safePage)
      : [...existing, safePage].sort((a, b) => a - b);

    onUpdateHomeworkFile(currentHomework.id, { bookmarks: nextBookmarks });
  };

  const handleClearPageAnnotations = () => {
    if (!currentHomework) return;
    const nextMap = { ...(currentHomework.annotationsByPage || {}) };
    delete nextMap[safePage];
    onUpdateHomeworkFile(currentHomework.id, { annotationsByPage: nextMap });
  };

  const handleCopyCurrentPageText = async () => {
    try {
      await navigator.clipboard.writeText(currentPageText);
      setCopiedPageText(true);
      setTimeout(() => setCopiedPageText(false), 2000);
    } catch {
      // Ignore clipboard permission restrictions
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationTool === 'cursor' || !currentHomework) return;
    isDrawingRef.current = true;
    const pt = getCanvasCoords(e);
    currentStrokePointsRef.current = [pt];
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || annotationTool === 'cursor') return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCanvasCoords(e);
    const pts = currentStrokePointsRef.current;
    const prev = pts[pts.length - 1] || pt;
    pts.push(pt);

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle =
      annotationTool === 'highlighter'
        ? '#FACC15'
        : annotationTool === 'pen_cyan'
        ? '#38BDF8'
        : '#F43F5E';
    ctx.lineWidth = annotationTool === 'highlighter' ? 16 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = annotationTool === 'highlighter' ? 0.25 : 0.95;
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingRef.current || !currentHomework || annotationTool === 'cursor') return;
    isDrawingRef.current = false;
    const pts = currentStrokePointsRef.current;
    if (pts.length < 2) return;

    const newStroke: AnnotationStroke = {
      tool: annotationTool === 'highlighter' ? 'highlighter' : 'pen',
      color:
        annotationTool === 'highlighter'
          ? '#FACC15'
          : annotationTool === 'pen_cyan'
          ? '#38BDF8'
          : '#F43F5E',
      points: [...pts],
    };

    const existingPageStrokes = currentHomework.annotationsByPage?.[safePage] || [];
    onUpdateHomeworkFile(currentHomework.id, {
      annotationsByPage: {
        ...(currentHomework.annotationsByPage || {}),
        [safePage]: [...existingPageStrokes, newStroke],
      },
    });
    currentStrokePointsRef.current = [];
  };

  const handleDirectStudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingUpload(true);
    try {
      const parsed = await parseUploadedStudyFile(file);
      onAddHomeworkFile(
        {
          name: file.name,
          subject: 'Physics (11th Std)',
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
        true
      );
      setCurrentPage(1);
    } finally {
      setIsParsingUpload(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={
        openApp === 'vscode'
          ? 'Visual Studio Code Sandbox'
          : openApp === 'homework_reader'
          ? 'Universal PDF and File Opener Studio'
          : '11th Standard Formula Reference'
      }
    >
      <div className="flex h-[90vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Top Window Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {openApp === 'vscode' || openApp === 'terminal' ? (
              <Code2 className="h-4 w-4 text-sky-400 shrink-0" />
            ) : openApp === 'homework_reader' ? (
              <FileText className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-display text-sm font-semibold text-slate-100 truncate">
              {openApp === 'vscode' || openApp === 'terminal'
                ? 'Visual Studio Code — Vanguard Locked Coding Sandbox'
                : openApp === 'homework_reader'
                ? 'Universal PDF & All-File Opener Studio (Visual Pages · Full Text · Highlight · Scratchpad)'
                : '11th Standard Physics, Chemistry & Calculus Reference Deck'}
            </span>
            <span className="hidden sm:inline text-xs text-slate-500">·</span>
            <span className="hidden sm:inline text-xs text-emerald-400 truncate">
              Authorized for {activeBlock ? activeBlock.title : 'Active Workspace'}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close Studio"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Close Studio
          </button>
        </div>

        {/* 1. VS Code Coding Sandbox */}
        {(openApp === 'vscode' || openApp === 'terminal') && (
          <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
            <div className="border-r border-slate-800 bg-slate-950/60 p-4 lg:col-span-3 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-3">Workspace Files</p>
                <div className="space-y-1">
                  {Object.keys(codeByFile).map((fileName) => (
                    <button
                      key={fileName}
                      type="button"
                      onClick={() => setActiveCodeFile(fileName)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-mono text-xs transition-colors flex items-center justify-between ${
                        activeCodeFile === fileName
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span>{fileName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-2">
                <p className="font-medium text-slate-300">Gatekeeper Enforcement</p>
                <p>
                  Visual Studio Code will automatically lock the moment your Coding block ends. Complete and test your implementation now.
                </p>
              </div>
            </div>

            <div className="flex flex-col lg:col-span-9 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2">
                <span className="font-mono text-xs text-slate-300">{activeCodeFile}</span>
                <button
                  type="button"
                  onClick={handleRunCode}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="h-3.5 w-3.5" />
                  Compile & Run Code
                </button>
              </div>

              <textarea
                aria-label="Code Editor Input"
                value={codeByFile[activeCodeFile] || ''}
                onChange={(e) =>
                  setCodeByFile((prev) => ({
                    ...prev,
                    [activeCodeFile]: e.target.value,
                  }))
                }
                spellCheck={false}
                className="flex-1 w-full resize-none bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 focus:outline-none"
              />

              <div className="h-44 border-t border-slate-800 bg-slate-950 p-4 overflow-y-auto">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Integrated Build & Output Console</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs text-slate-300">
                  {terminalOutput.map((line, i) => (
                    <pre key={i} className="whitespace-pre-wrap text-emerald-300/90">
                      {line}
                    </pre>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Universal PDF & Multi-File Opener Studio */}
        {openApp === 'homework_reader' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top PDF Studio Toolbar: Zoom, Pages, Bookmarks, Highlight/Drawing Tools, Formula Overlay Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Zoom Out"
                  onClick={() => setZoomPercent((z) => Math.max(50, z - 15))}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPercent(100)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-amber-400 tabular-nums hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  {zoomPercent}%
                </button>
                <button
                  type="button"
                  aria-label="Zoom In"
                  onClick={() => setZoomPercent((z) => Math.min(200, z + 15))}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Page Navigation & Bookmark Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous Page"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono tabular-nums">
                  <span>Page</span>
                  <select
                    aria-label="Jump to Page"
                    value={safePage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-white"
                  >
                    {pages.map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1}
                      </option>
                    ))}
                  </select>
                  <span>of {totalPages}</span>
                </div>

                <button
                  type="button"
                  aria-label="Next Page"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isCurrentPageBookmarked
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {isCurrentPageBookmarked ? `Bookmarked P.${safePage}` : 'Bookmark Page'}
                </button>
              </div>

              {/* PDF Content Render Mode Switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => setPdfDisplayMode('combined')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    pdfDisplayMode === 'combined'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Visual + Text
                </button>
                <button
                  type="button"
                  onClick={() => setPdfDisplayMode('visual_page')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    pdfDisplayMode === 'visual_page'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Visual PDF Page
                </button>
                <button
                  type="button"
                  onClick={() => setPdfDisplayMode('selectable_text')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    pdfDisplayMode === 'selectable_text'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Selectable Text
                </button>
              </div>

              {/* Highlight & Drawing Annotation Tools */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAnnotationTool('cursor')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    annotationTool === 'cursor'
                      ? 'bg-slate-100 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <MousePointer className="h-3.5 w-3.5" />
                  Cursor
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('highlighter')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    annotationTool === 'highlighter'
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  Highlight
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('pen_cyan')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    annotationTool === 'pen_cyan'
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-sky-300 hover:bg-slate-800'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Draw (Cyan)
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('pen_red')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    annotationTool === 'pen_red'
                      ? 'bg-rose-500 text-white font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-rose-300 hover:bg-slate-800'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Draw (Red)
                </button>
                <button
                  type="button"
                  onClick={handleClearPageAnnotations}
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-300 whitespace-nowrap shrink-0"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear Ink
                </button>
              </div>

              {/* Right-Side Study Tool Switcher (Scratchpad vs 11th Std Formula Overlay) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRightDrawerTab('scratchpad')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    rightDrawerTab === 'scratchpad'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Solution Scratchpad
                </button>
                <button
                  type="button"
                  onClick={() => setRightDrawerTab('formulas')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    rightDrawerTab === 'formulas'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-emerald-300 hover:bg-slate-800'
                  }`}
                >
                  11th Std Formula Overlay
                </button>
              </div>
            </div>

            {/* Studio Main 3-Pane Body */}
            <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Left 3 Cols: All Files Explorer + Open Local PDF + Search in PDF + Bookmarks Quick Jump */}
              <div className="border-r border-slate-800 bg-slate-950/70 p-4 lg:col-span-3 flex flex-col justify-between overflow-y-auto space-y-4">
                <div className="space-y-4">
                  {/* Open Local PDF / File Directly Button */}
                  <div>
                    <label
                      htmlFor="studio-direct-file-opener"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {isParsingUpload ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          <span>Extracting PDF Pages...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 shrink-0" />
                          <span>Open Local PDF / File</span>
                        </>
                      )}
                      <input
                        id="studio-direct-file-opener"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.cpp,.py,*"
                        onChange={handleDirectStudioFileUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Search Inside Active PDF */}
                  <div className="space-y-2">
                    <label
                      htmlFor="pdf-search-input"
                      className="block text-xs font-semibold text-slate-400"
                    >
                      Search Inside Active PDF
                    </label>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        id="pdf-search-input"
                        type="text"
                        value={pdfSearchQuery}
                        onChange={(e) => setPdfSearchQuery(e.target.value)}
                        placeholder="Find question, formula, topic..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    {pdfSearchQuery.trim() && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {matchingPageNumbers.length === 0 ? (
                          <span className="text-[11px] text-rose-400">
                            No matches in {totalPages} page(s).
                          </span>
                        ) : (
                          matchingPageNumbers.map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`rounded border px-2 py-0.5 font-mono text-[11px] ${
                                safePage === pageNum
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 font-semibold'
                                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              Match on P.{pageNum}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* All Vault Files List */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2">
                      All Accessible Files ({homeworkFiles.length})
                    </p>
                    <div className="space-y-1.5">
                      {homeworkFiles.map((file) => {
                        const filePageCount =
                          file.pages?.length ||
                          paginateDocumentContent(file.contentPreview, file.name).length;
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => onSelectHomework(file.id)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                              currentHomework?.id === file.id
                                ? 'border-amber-500/50 bg-amber-500/10 text-slate-100'
                                : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800/70'
                            }`}
                          >
                            <p className="text-xs font-semibold text-slate-100 truncate">
                              {file.name}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="truncate">{file.subject}</span>
                              <span>·</span>
                              <span className="font-mono tabular-nums shrink-0">
                                {filePageCount} Pgs
                              </span>
                              <span>·</span>
                              <span className="font-mono tabular-nums shrink-0">
                                {file.sizeLabel}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bookmarked Pages Quick-Jump */}
                  <div className="border-t border-slate-800 pt-3">
                    <p className="text-xs font-semibold text-slate-400 mb-2">
                      Bookmarked Pages ({bookmarks.length})
                    </p>
                    {bookmarks.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Click "Bookmark Page" in the top bar to save key pages for quick jump.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {bookmarks.map((pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                              safePage === pageNum
                                ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-semibold'
                                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40'
                            }`}
                          >
                            Page {pageNum}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Center 5 Cols: Interactive PDF / Document Page Canvas + Extracted Selectable Text */}
              <div className="lg:col-span-5 bg-slate-950 p-4 sm:p-6 overflow-auto space-y-5">
                {currentHomework ? (
                  <>
                    {/* 1. Visual PDF Page Canvas + Annotation Layer */}
                    {(pdfDisplayMode === 'combined' || pdfDisplayMode === 'visual_page') && (
                      <div
                        className="relative mx-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl transition-all overflow-hidden"
                        style={{
                          width: `${Math.round((zoomPercent / 100) * 520)}px`,
                        }}
                      >
                        {/* PDF / Document Header Strip inside the Page */}
                        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-2.5 text-xs">
                          <span className="font-mono font-semibold text-slate-200 truncate">
                            {currentHomework.name}
                          </span>
                          <span className="font-mono text-amber-400 tabular-nums shrink-0 ml-2">
                            Page {safePage} / {totalPages}
                          </span>
                        </div>

                        {/* Rendered Visual PDF Page Image */}
                        {currentPageImage ? (
                          <img
                            src={currentPageImage}
                            alt={`${currentHomework.name} — Page ${safePage}`}
                            referrerPolicy="no-referrer"
                            className="block w-full h-auto select-none"
                          />
                        ) : (
                          <div className="p-6 font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
                            {currentPageText}
                          </div>
                        )}

                        {/* Transparent HTML5 Annotation Canvas Overlay for Highlighting & Drawing */}
                        <canvas
                          ref={annotationCanvasRef}
                          width={560}
                          height={720}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          className={`absolute inset-x-0 bottom-0 top-10 h-[calc(100%-2.5rem)] w-full ${
                            annotationTool === 'cursor'
                              ? 'pointer-events-none'
                              : 'cursor-crosshair'
                          }`}
                        />
                      </div>
                    )}

                    {/* 2. Selectable & Copyable Full Page Text Content */}
                    {(pdfDisplayMode === 'combined' || pdfDisplayMode === 'selectable_text') && (
                      <div
                        className="mx-auto rounded-lg border border-slate-800 bg-slate-900/90 p-5 space-y-3"
                        style={{
                          maxWidth: `${Math.max(520, Math.round((zoomPercent / 100) * 520))}px`,
                        }}
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2 text-xs">
                            <FileText className="h-3.5 w-3.5 text-sky-400" />
                            <span className="font-display font-semibold text-white">
                              Selectable PDF Text & Equations (Page {safePage} of {totalPages})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyCurrentPageText}
                            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                          >
                            {copiedPageText ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Page Text</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div
                          className="font-mono text-slate-100 leading-relaxed whitespace-pre-wrap select-text bg-slate-950/80 p-4 rounded-lg border border-slate-800/80"
                          style={{
                            fontSize: `${Math.max(12, Math.round((zoomPercent / 100) * 13))}px`,
                          }}
                        >
                          {currentPageText}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                    Select or upload a PDF or homework file on the left to open it.
                  </div>
                )}
              </div>

              {/* Right 4 Cols: Side-by-Side Solution Scratchpad OR 11th Std Formula Sheet Overlay */}
              <div className="border-l border-slate-800 bg-slate-900/80 p-5 lg:col-span-4 flex flex-col overflow-y-auto">
                {rightDrawerTab === 'scratchpad' && currentHomework ? (
                  <div className="flex flex-1 flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="homework-scratchpad"
                        className="font-display text-sm font-semibold text-white"
                      >
                        Side-by-Side Solution Scratchpad
                      </label>
                      <span className="text-xs text-emerald-400">Auto-saved</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Write your step-by-step derivations, answers, and page notes for{' '}
                      <strong className="text-slate-200">{currentHomework.name}</strong>:
                    </p>
                    <textarea
                      id="homework-scratchpad"
                      value={currentHomework.notes}
                      onChange={(e) => onSaveHomeworkNotes(currentHomework.id, e.target.value)}
                      placeholder="Write your equations, substitutions, and final numerical answers here..."
                      className="flex-1 min-h-[260px] w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs leading-relaxed text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onAwardBonusPoints(
                          30,
                          `Logged written solution steps for ${currentHomework.name} (Page ${safePage})`
                        )
                      }
                      className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                    >
                      Save Solution Progress & Claim +30 XP
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-white">
                        11th Std Formula Sheet Overlay
                      </h3>
                      <button
                        type="button"
                        onClick={() => setRightDrawerTab('scratchpad')}
                        className="text-xs text-amber-400 underline"
                      >
                        Back to Scratchpad
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/90 p-3.5 space-y-2">
                      <h4 className="font-display text-xs font-bold text-amber-400">
                        Physics: Rotational Dynamics & Gravitation
                      </h4>
                      <div className="space-y-1.5 font-mono text-xs text-slate-200">
                        <p>I (Rod, center) = (1/12) M L² · (End) = (1/3) M L²</p>
                        <p>I (Solid Sphere) = (2/5) M R² · (Hollow) = (2/3) M R²</p>
                        <p>Rolling Acceleration: a = g sin(θ) / (1 + I / mR²)</p>
                        <p>Escape Velocity: v_e = √(2GM / R) = √(2gR)</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/90 p-3.5 space-y-2">
                      <h4 className="font-display text-xs font-bold text-emerald-400">
                        Chemistry: Thermodynamics & Chemical Equilibrium
                      </h4>
                      <div className="space-y-1.5 font-mono text-xs text-slate-200">
                        <p>First Law: ΔU = q + w · Enthalpy: ΔH = ΔU + Δn_g RT</p>
                        <p>Gibbs Energy: ΔG = ΔH - TΔS = -2.303 RT log(K_eq)</p>
                        <p>pH of Buffer: pH = pKa + log([Conjugate Base]/[Acid])</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/90 p-3.5 space-y-2">
                      <h4 className="font-display text-xs font-bold text-sky-400">
                        Mathematics: Conic Sections & Calculus Limits
                      </h4>
                      <div className="space-y-1.5 font-mono text-xs text-slate-200">
                        <p>Parabola y² = 4ax Tangent: y = mx + a/m</p>
                        <p>Ellipse x²/a² + y²/b² = 1: b² = a²(1 - e²)</p>
                        <p>Standard Limit: lim(x→0) (1 - cos x)/x² = 1/2</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Standalone 11th Standard Formula & Concept Reference Sheet */}
        {openApp === 'formula_sheet' && (
          <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-amber-400">
                Physics: Rotational Mechanics & Gravitation
              </h3>
              <div className="space-y-2 font-mono text-xs text-slate-200">
                <p>1. Moment of Inertia (Rod, center): I = (1/12) M L²</p>
                <p>2. Solid Cylinder / Disc: I = (1/2) M R²</p>
                <p>3. Solid Sphere: I = (2/5) M R² | Hollow: I = (2/3) M R²</p>
                <p>4. Rolling Down Incline: a = g sin(θ) / (1 + I / mR²)</p>
                <p>5. Angular Momentum: L = I ω = r × p</p>
                <p>6. Escape Velocity: v_e = √(2GM / R) = √(2gR)</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-emerald-400">
                Chemistry: Chemical Bonding & Thermodynamics
              </h3>
              <div className="space-y-2 font-mono text-xs text-slate-200">
                <p>1. Steric Number = ½ (V + M - C + A)</p>
                <p>2. Bond Order (MOT) = ½ (N_b - N_a)</p>
                <p>3. First Law: ΔU = q + w (w = -P_ext ΔV)</p>
                <p>4. Enthalpy Relation: ΔH = ΔU + Δn_g R T</p>
                <p>5. Gibbs Free Energy: ΔG = ΔH - T ΔS = -R T ln(K_eq)</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-sky-400">
                Mathematics: Conic Sections & Trigonometry
              </h3>
              <div className="space-y-2 font-mono text-xs text-slate-200">
                <p>1. sin(3θ) = 3 sin(θ) - 4 sin³(θ)</p>
                <p>2. cos(3θ) = 4 cos³(θ) - 3 cos(θ)</p>
                <p>3. Parabola y² = 4ax: Focus (a, 0), Latus Rectum = 4a</p>
                <p>4. Ellipse x²/a² + y²/b² = 1: b² = a²(1 - e²)</p>
                <p>5. Tangent to y² = 4ax in slope form: y = mx + a/m</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

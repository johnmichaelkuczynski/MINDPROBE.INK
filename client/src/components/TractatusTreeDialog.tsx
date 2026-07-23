import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Loader2, ChevronRight, TreePine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LLMProvider } from "@/types/analysis";

interface TractatusStatement {
  number: string;
  text: string;
  depth: number;
}

interface TractatusTreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputText: string;
  selectedLLM: LLMProvider;
}

export function TractatusTreeDialog({ open, onOpenChange, inputText, selectedLLM }: TractatusTreeDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [columns, setColumns] = useState<TractatusStatement[][]>([]);
  const [activeColumn, setActiveColumn] = useState(0);
  const [title, setTitle] = useState("TRACTATUS TREE");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      toast({ title: "No text", description: "Enter text in the main input first.", variant: "destructive" });
      return;
    }
    if (inputText.trim().split(/\s+/).length < 100) {
      toast({ title: "Text too short", description: "Minimum 100 words required.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setColumns([]);
    setActiveColumn(0);
    setProgress({ current: 0, total: 1, message: "Starting…" });

    try {
      const response = await fetch('/api/tractatus-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, provider: selectedLLM }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setProgress({ current: data.current, total: data.total, message: data.message });
            } else if (data.type === 'complete') {
              setColumns(data.result.columns);
              setActiveColumn(data.result.columns.length - 1);
              setProgress(null);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseErr) {
            // skip malformed lines
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadTxt = () => {
    const fullTree = columns[columns.length - 1] ?? [];
    const content = fullTree.map(s => `${'  '.repeat(s.depth)}${s.number} ${s.text}`).join('\n');
    const blob = new Blob([`${title}\n${'='.repeat(60)}\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tractatus_tree.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const { saveAs } = await import('file-saver');
      const fullTree = columns[columns.length - 1] ?? [];
      const children: any[] = [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '' }),
      ];
      fullTree.forEach(s => {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: `${s.number}  ${s.text}`,
              bold: s.depth === 0,
              size: s.depth === 0 ? 26 : s.depth === 1 ? 24 : 22,
            }),
          ],
          indent: { left: s.depth * 400 },
          spacing: { after: s.depth === 0 ? 120 : 60 },
        }));
      });
      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'tractatus_tree.docx');
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const activeStatements = columns[activeColumn] ?? [];
  const depthColors = [
    'text-indigo-900 font-bold',
    'text-indigo-700 font-semibold',
    'text-indigo-600',
    'text-indigo-500',
    'text-indigo-400',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-indigo-600" />
            <DialogTitle>Tractatus Tree</DialogTitle>
          </div>
        </DialogHeader>

        {/* Title + controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Document title (for download)"
            className="flex-1 font-semibold"
            data-testid="tractatus-title"
          />
          {!isGenerating && columns.length === 0 && (
            <Button
              onClick={handleGenerate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0"
              data-testid="tractatus-generate"
            >
              <TreePine className="h-4 w-4" />
              Generate
            </Button>
          )}
          {!isGenerating && columns.length > 0 && (
            <>
              <Button
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                data-testid="tractatus-regenerate"
              >
                <Loader2 className="h-3 w-3" />
                Re-generate
              </Button>
              <Button
                onClick={downloadTxt}
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                data-testid="tractatus-download-txt"
              >
                <FileText className="h-3 w-3" />
                .txt
              </Button>
              <Button
                onClick={downloadDocx}
                variant="outline"
                size="sm"
                className="gap-1 shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                data-testid="tractatus-download-docx"
              >
                <Download className="h-3 w-3" />
                .docx
              </Button>
            </>
          )}
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-sm text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{progress?.message ?? 'Working…'}</span>
            </div>
            {progress && (
              <Progress
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                className="h-1.5"
              />
            )}
          </div>
        )}

        {/* Zoom-level tabs */}
        {columns.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1">
            {columns.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveColumn(idx)}
                data-testid={`tractatus-level-${idx}`}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  idx === activeColumn
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                {idx === 0 ? 'Top level' : `Depth ${idx + 1}`}
                {idx === columns.length - 1 && <span className="opacity-60 text-xs">(full)</span>}
                {idx < columns.length - 1 && <ChevronRight className="h-3 w-3 opacity-40" />}
              </button>
            ))}
            <span className="ml-2 text-xs text-gray-400">{activeStatements.length} propositions</span>
          </div>
        )}

        {/* Tree content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!isGenerating && columns.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-3">
              <TreePine className="h-10 w-10 opacity-30" />
              <p className="text-sm">Click Generate to transform the input text into a Tractatus hierarchy.</p>
            </div>
          )}

          {activeStatements.length > 0 && (
            <div className="space-y-0.5 font-mono text-sm leading-relaxed py-2">
              {activeStatements.map((s, i) => (
                <div
                  key={i}
                  className={`flex gap-3 px-2 py-1 rounded hover:bg-gray-50 transition-colors`}
                  style={{ paddingLeft: `${s.depth * 1.5 + 0.5}rem` }}
                  data-testid={`tractatus-statement-${i}`}
                >
                  <span className={`shrink-0 tabular-nums ${depthColors[Math.min(s.depth, depthColors.length - 1)]}`}>
                    {s.number}
                  </span>
                  <span className={`${depthColors[Math.min(s.depth, depthColors.length - 1)]}`}>
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisType, toBaseType, LLMProvider } from "@/types/analysis";
import { RealTimeResults } from "@/components/RealTimeResults";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  GitCompare, Play, RefreshCw, Clipboard, Trash2, Upload, X, File, Loader2
} from "lucide-react";

interface ComparePanelProps {
  selectedAnalysisType: AnalysisType;
  selectedLLM: LLMProvider;
  onNewAnalysis: () => void;
}

type Step = 'input' | 'running';

interface DocInput {
  label: string;
  text: string;
  uploadedFile: File | null;
}

export function ComparePanel({ selectedAnalysisType, selectedLLM, onNewAnalysis }: ComparePanelProps) {
  const baseType = toBaseType(selectedAnalysisType);

  const [step, setStep] = useState<Step>('input');
  const [isStarting, setIsStarting] = useState(false);

  const [docA, setDocA] = useState<DocInput>({ label: 'Document A', text: '', uploadedFile: null });
  const [docB, setDocB] = useState<DocInput>({ label: 'Document B', text: '', uploadedFile: null });

  const [analysisIdA, setAnalysisIdA] = useState<string | null>(null);
  const [analysisIdB, setAnalysisIdB] = useState<string | null>(null);
  const [analysisIdC, setAnalysisIdC] = useState<string | null>(null);

  const [completedA, setCompletedA] = useState(false);
  const [completedB, setCompletedB] = useState(false);
  const [generatingComparison, setGeneratingComparison] = useState(false);

  const labelARef = useRef(docA.label);
  const labelBRef = useRef(docB.label);

  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (which: 'A' | 'B', file: File) => {
    const setter = which === 'A' ? setDocA : setDocB;
    setter(prev => ({ ...prev, uploadedFile: file }));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('Upload failed');
      const data = await resp.json();
      setter(prev => ({ ...prev, text: data.text || '' }));
      toast({ title: 'File uploaded', description: `Extracted text from ${file.name}` });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not process file', variant: 'destructive' });
      setter(prev => ({ ...prev, uploadedFile: null }));
    }
  };

  const handleRun = async () => {
    if (!docA.text.trim() || !docB.text.trim()) {
      toast({ title: 'Both documents required', description: 'Please provide text for both Document A and Document B.', variant: 'destructive' });
      return;
    }
    labelARef.current = docA.label || 'Document A';
    labelBRef.current = docB.label || 'Document B';
    setIsStarting(true);
    try {
      const resp = await apiRequest('POST', '/api/analyze-compare', {
        baseAnalysisType: baseType,
        provider: selectedLLM,
        textA: docA.text,
        textB: docB.text,
        labelA: docA.label || 'Document A',
        labelB: docB.label || 'Document B',
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setAnalysisIdA(data.analysisIdA);
      setAnalysisIdB(data.analysisIdB);
      setCompletedA(false);
      setCompletedB(false);
      setAnalysisIdC(null);
      setStep('running');
    } catch (err: any) {
      toast({ title: 'Failed to start', description: err.message, variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCompleteA = useCallback(() => setCompletedA(true), []);
  const handleCompleteB = useCallback(() => setCompletedB(true), []);

  useEffect(() => {
    if (completedA && completedB && analysisIdA && analysisIdB && !analysisIdC && !generatingComparison) {
      setGeneratingComparison(true);
      apiRequest('POST', '/api/compare-generate', {
        analysisIdA,
        analysisIdB,
        baseAnalysisType: baseType,
        provider: selectedLLM,
        labelA: labelARef.current,
        labelB: labelBRef.current,
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setAnalysisIdC(data.analysisIdC);
        })
        .catch((err: any) => {
          toast({ title: 'Comparison failed', description: err.message, variant: 'destructive' });
        })
        .finally(() => setGeneratingComparison(false));
    }
  }, [completedA, completedB, analysisIdA, analysisIdB, analysisIdC, generatingComparison, baseType, selectedLLM]);

  const handleReset = () => {
    setStep('input');
    setDocA({ label: 'Document A', text: '', uploadedFile: null });
    setDocB({ label: 'Document B', text: '', uploadedFile: null });
    setAnalysisIdA(null);
    setAnalysisIdB(null);
    setAnalysisIdC(null);
    setCompletedA(false);
    setCompletedB(false);
    setGeneratingComparison(false);
  };

  const DocInputCard = ({
    which,
    doc,
    setDoc,
    fileInputRef,
  }: {
    which: 'A' | 'B';
    doc: DocInput;
    setDoc: React.Dispatch<React.SetStateAction<DocInput>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const accent = which === 'A' ? 'violet' : 'orange';
    const borderCls = which === 'A' ? 'border-violet-200' : 'border-orange-200';
    const labelCls = which === 'A' ? 'text-violet-700' : 'text-orange-700';
    const dotCls = which === 'A' ? 'bg-violet-500' : 'bg-orange-500';
    const uploadHoverCls = which === 'A' ? 'hover:border-violet-400' : 'hover:border-orange-400';
    const uploadIconCls = which === 'A' ? 'text-violet-500' : 'text-orange-500';
    const fileBgCls = which === 'A' ? 'bg-violet-50 border-violet-200' : 'bg-orange-50 border-orange-200';
    const fileIconCls = which === 'A' ? 'text-violet-600' : 'text-orange-600';
    const fileTextCls = which === 'A' ? 'text-violet-700' : 'text-orange-700';

    return (
      <Card className={`border shadow-sm ${borderCls}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full ${dotCls}`} />
            <Input
              value={doc.label}
              onChange={e => setDoc(prev => ({ ...prev, label: e.target.value }))}
              className={`font-semibold text-sm border-0 p-0 h-auto focus-visible:ring-0 ${labelCls} bg-transparent`}
              placeholder={`Document ${which}`}
              data-testid={`compare-label-${which.toLowerCase()}`}
            />
          </div>
          <Textarea
            value={doc.text}
            onChange={e => setDoc(prev => ({ ...prev, text: e.target.value }))}
            placeholder={`Paste the text of ${doc.label || `Document ${which}`} here…`}
            className="min-h-48 resize-none font-mono text-xs"
            data-testid={`compare-text-${which.toLowerCase()}`}
          />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{doc.text.length} chars</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const t = await navigator.clipboard.readText();
                  setDoc(prev => ({ ...prev, text: prev.text + t }));
                }}
                className="text-gray-400 hover:text-gray-700 h-7 px-2"
                data-testid={`compare-paste-${which.toLowerCase()}`}
              >
                <Clipboard className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDoc(prev => ({ ...prev, text: '', uploadedFile: null }))}
                className="text-gray-400 hover:text-red-500 h-7 px-2"
                data-testid={`compare-clear-${which.toLowerCase()}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div
            className={`border-2 border-dashed border-border-light rounded-lg p-3 text-center ${uploadHoverCls} transition-colors cursor-pointer`}
            onClick={() => fileInputRef.current?.click()}
            data-testid={`compare-upload-${which.toLowerCase()}`}
          >
            <Upload className={`h-5 w-5 mx-auto mb-1 ${uploadIconCls}`} />
            <p className="text-xs text-gray-500">Upload file (PDF, .docx, .txt)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(which, f); }}
              data-testid={`compare-file-input-${which.toLowerCase()}`}
            />
          </div>
          {doc.uploadedFile && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${fileBgCls}`}>
              <File className={`h-3 w-3 ${fileIconCls}`} />
              <span className={`text-xs flex-1 font-medium ${fileTextCls}`}>{doc.uploadedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDoc(prev => ({ ...prev, uploadedFile: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-gray-400 hover:text-red-500 h-5 w-5 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (step === 'input') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <DocInputCard which="A" doc={docA} setDoc={setDocA} fileInputRef={fileInputARef} />
          <DocInputCard which="B" doc={docB} setDoc={setDocB} fileInputRef={fileInputBRef} />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRun}
            disabled={isStarting || !docA.text.trim() || !docB.text.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            data-testid="compare-run-button"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run {baseType.replace(/-/g, ' ')} on both documents
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-semibold">Compare Results</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {baseType.replace(/-/g, ' ')}
          </span>
        </div>
        <Button
          onClick={() => { handleReset(); onNewAnalysis(); }}
          variant="outline"
          size="sm"
          className="border-gray-300 gap-1"
          data-testid="compare-new-analysis"
        >
          <RefreshCw className="h-3 w-3" /> New Analysis
        </Button>
      </div>

      {/* Individual reports side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <h3 className="font-bold text-violet-700 uppercase tracking-wide text-sm">{docA.label}</h3>
          </div>
          <RealTimeResults
            analysisId={analysisIdA}
            isStreaming={true}
            onComplete={handleCompleteA}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <h3 className="font-bold text-orange-700 uppercase tracking-wide text-sm">{docB.label}</h3>
          </div>
          <RealTimeResults
            analysisId={analysisIdB}
            isStreaming={true}
            onComplete={handleCompleteB}
          />
        </div>
      </div>

      {/* Comparison report */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-600" />
          <h3 className="font-bold text-indigo-700 uppercase tracking-wide text-sm">
            Comparative Report — {docA.label} vs {docB.label}
          </h3>
          {generatingComparison && (
            <span className="flex items-center gap-1 text-xs text-indigo-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating comparison…
            </span>
          )}
          {!generatingComparison && !analysisIdC && (!completedA || !completedB) && (
            <span className="text-xs text-gray-400">Waiting for both reports to complete…</span>
          )}
        </div>
        {analysisIdC ? (
          <RealTimeResults analysisId={analysisIdC} isStreaming={true} />
        ) : (
          <Card className="border-indigo-100 border-dashed">
            <CardContent className="p-8 text-center text-gray-400 text-sm">
              {generatingComparison
                ? 'Building the comparative report…'
                : 'The comparative report will appear here once both individual analyses are complete.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

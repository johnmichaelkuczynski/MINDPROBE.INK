import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisType, toBaseType, LLMProvider } from "@/types/analysis";
import { RealTimeResults } from "@/components/RealTimeResults";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Wand2, Play, RefreshCw, Clipboard, Trash2, Upload, X, File } from "lucide-react";

interface DuoPanelProps {
  selectedAnalysisType: AnalysisType;
  selectedLLM: LLMProvider;
  onNewAnalysis: () => void;
}

type Step = 'input' | 'formatting' | 'preview' | 'running';

interface FormattedDialogue {
  speakerA: string;
  speakerB: string;
  formattedText: string;
  turns: { speaker: string; label: string; text: string }[];
}

export function DuoPanel({ selectedAnalysisType, selectedLLM, onNewAnalysis }: DuoPanelProps) {
  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [formatted, setFormatted] = useState<FormattedDialogue | null>(null);
  const [speakerAName, setSpeakerAName] = useState('');
  const [speakerBName, setSpeakerBName] = useState('');
  const [analysisIdA, setAnalysisIdA] = useState<string | null>(null);
  const [analysisIdB, setAnalysisIdB] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const baseType = toBaseType(selectedAnalysisType);

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('Upload failed');
      const data = await resp.json();
      setRawText(data.text || '');
      toast({ title: 'File uploaded', description: `Extracted text from ${file.name}` });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not process file', variant: 'destructive' });
    }
  };

  const handleFormatDialogue = async () => {
    if (!rawText.trim()) {
      toast({ title: 'Text required', description: 'Paste or upload a dialogue first', variant: 'destructive' });
      return;
    }
    setStep('formatting');
    try {
      const resp = await apiRequest('POST', '/api/format-dialogue', { text: rawText, provider: selectedLLM });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setFormatted(data);
      setSpeakerAName(data.speakerA);
      setSpeakerBName(data.speakerB);
      setStep('preview');
    } catch (err: any) {
      toast({ title: 'Format failed', description: err.message || 'Could not parse dialogue', variant: 'destructive' });
      setStep('input');
    }
  };

  const handleRunDuoAnalysis = async () => {
    if (!formatted) return;
    try {
      const usedText = rebuildFormattedText();
      const resp = await apiRequest('POST', '/api/analyze-duo', {
        baseAnalysisType: baseType,
        provider: selectedLLM,
        formattedText: usedText,
        speakerA: speakerAName,
        speakerB: speakerBName,
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setAnalysisIdA(data.analysisIdA);
      setAnalysisIdB(data.analysisIdB);
      setStep('running');
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    }
  };

  const rebuildFormattedText = (): string => {
    if (!formatted) return '';
    const oldA = formatted.speakerA;
    const oldB = formatted.speakerB;
    return formatted.turns
      .map(t => {
        const newLabel = t.speaker === 'A' ? speakerAName : speakerBName;
        const oldLabel = t.speaker === 'A' ? oldA : oldB;
        const text = t.text.startsWith(`${oldLabel}:`) ? t.text.slice(oldLabel.length + 1).trim() : t.text;
        return `${newLabel}: ${text}`;
      })
      .join('\n');
  };

  const handleReset = () => {
    setStep('input');
    setRawText('');
    setFormatted(null);
    setSpeakerAName('');
    setSpeakerBName('');
    setAnalysisIdA(null);
    setAnalysisIdB(null);
    setUploadedFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Step: Input */}
      {(step === 'input' || step === 'formatting') && (
        <>
          <Card className="border-border-light shadow-sm border-teal-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  <h3 className="text-lg font-semibold">Dialogue Transcript</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setRawText('')} className="text-gray-500 hover:text-red-500" data-testid="duo-clear-text">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => { const t = await navigator.clipboard.readText(); setRawText(prev => prev + t); }} className="text-gray-500 hover:text-teal-600" data-testid="duo-paste-text">
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={"Paste a dialogue transcript here — formatted or unformatted.\n\nExamples that work:\n  SMITH: We need to close this by Friday.\n  JONES: That's not realistic given the delays.\n\nOr even unformatted:\n  She said she needed more time. I told her time was the one thing we didn't have..."}
                className="min-h-64 resize-none font-mono text-sm"
                data-testid="duo-input-text"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{rawText.length} chars</span>
                <span>{rawText.trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="border-border-light shadow-sm">
            <CardContent className="p-4">
              <div
                className="border-2 border-dashed border-border-light rounded-lg p-6 text-center hover:border-teal-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                data-testid="duo-file-upload"
              >
                <Upload className="h-8 w-8 text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Upload transcript file</p>
                <p className="text-xs text-gray-400 mt-1">PDF, .docx, .txt</p>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} data-testid="duo-file-input" />
              </div>
              {uploadedFile && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <File className="h-4 w-4 text-teal-600" />
                  <span className="text-sm text-teal-700 flex-1 font-medium">{uploadedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={handleFormatDialogue}
              disabled={step === 'formatting' || !rawText.trim()}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2"
              data-testid="duo-format-button"
            >
              {step === 'formatting' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Parsing dialogue…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Format Dialogue
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Step: Preview */}
      {step === 'preview' && formatted && (
        <>
          <Card className="border-teal-300 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-teal-700">Formatted Dialogue Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="text-gray-500 hover:text-teal-600 gap-1 text-xs">
                  <RefreshCw className="h-3 w-3" /> Re-format
                </Button>
              </div>

              {/* Speaker name editors */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Speaker A name</label>
                  <Input
                    value={speakerAName}
                    onChange={e => setSpeakerAName(e.target.value.toUpperCase())}
                    className="font-mono border-teal-300 focus:ring-teal-400"
                    data-testid="duo-speaker-a-name"
                    placeholder="SPEAKER_A"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Speaker B name</label>
                  <Input
                    value={speakerBName}
                    onChange={e => setSpeakerBName(e.target.value.toUpperCase())}
                    className="font-mono border-teal-300 focus:ring-teal-400"
                    data-testid="duo-speaker-b-name"
                    placeholder="SPEAKER_B"
                  />
                </div>
              </div>

              {/* Formatted text preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-1">
                {formatted.turns.map((turn, i) => {
                  const isA = turn.speaker === 'A';
                  const label = isA ? speakerAName : speakerBName;
                  return (
                    <div key={i} className={`flex gap-2 ${isA ? '' : 'pl-4'}`}>
                      <span className={`font-bold shrink-0 ${isA ? 'text-teal-700' : 'text-indigo-700'}`}>{label}:</span>
                      <span className="text-gray-700">{turn.text}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">{formatted.turns.length} turns detected · {formatted.turns.filter(t => t.speaker === 'A').length} from {speakerAName} · {formatted.turns.filter(t => t.speaker === 'B').length} from {speakerBName}</p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleReset} variant="outline" className="border-gray-300" data-testid="duo-reset-button">
              Start Over
            </Button>
            <Button
              onClick={handleRunDuoAnalysis}
              disabled={!speakerAName.trim() || !speakerBName.trim()}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2"
              data-testid="duo-run-button"
            >
              <Play className="h-4 w-4" />
              Run {baseType.replace(/-/g, ' ')} on both speakers
            </Button>
          </div>
        </>
      )}

      {/* Step: Running / Results */}
      {step === 'running' && analysisIdA && analysisIdB && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h2 className="text-xl font-semibold">Duo Analysis Results</h2>
            </div>
            <Button onClick={() => { handleReset(); onNewAnalysis(); }} variant="outline" size="sm" className="border-gray-300 gap-1" data-testid="duo-new-analysis">
              <RefreshCw className="h-3 w-3" /> New Analysis
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Speaker A */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <h3 className="font-bold text-teal-700 uppercase tracking-wide text-sm">{speakerAName}</h3>
              </div>
              <RealTimeResults analysisId={analysisIdA} isStreaming={true} />
            </div>
            {/* Speaker B */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <h3 className="font-bold text-indigo-700 uppercase tracking-wide text-sm">{speakerBName}</h3>
              </div>
              <RealTimeResults analysisId={analysisIdB} isStreaming={true} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

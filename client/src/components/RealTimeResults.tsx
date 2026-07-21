import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Loader2, Download, Brain, CheckCircle2, AlertCircle } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import { StreamEvent } from "@/types/analysis";

interface RealTimeResultsProps {
  analysisId: string | null;
  isStreaming: boolean;
}

interface ProcessedResult {
  type: 'summary' | 'question';
  content: string;
  questionId?: string;
  question?: string;
  complete: boolean;
}

interface SkeletonStatus {
  phase: 'idle' | 'extracting' | 'complete' | 'failed';
  message: string;
  documentType?: string;
  isExcerpt?: boolean;
}

export function RealTimeResults({ analysisId, isStreaming }: RealTimeResultsProps) {
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [streamingStatus, setStreamingStatus] = useState("Ready");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [skeletonStatus, setSkeletonStatus] = useState<SkeletonStatus>({ phase: 'idle', message: '' });

  const streamUrl = analysisId ? `/api/analysis/${analysisId}/stream` : null;
  
  const { data: streamData, isConnected, error } = useSSE<StreamEvent>(streamUrl, (event) => {
    console.log('RealTimeResults received event:', event);
    
    if (event.type === 'skeleton') {
      const d = event.data as any;
      if (d.status === 'extracting') {
        setSkeletonStatus({ phase: 'extracting', message: d.message });
      } else if (d.status === 'complete') {
        setSkeletonStatus({
          phase: 'complete',
          message: d.message,
          documentType: d.skeleton?.documentType,
          isExcerpt: d.skeleton?.isExcerpt,
        });
      } else if (d.status === 'failed') {
        setSkeletonStatus({ phase: 'failed', message: d.message });
      }
    } else if (event.type === 'summary') {
      console.log('Processing summary event:', event.data);
      setResults(prev => {
        const existingSummaryIndex = prev.findIndex(r => r.type === 'summary');
        const newResult: ProcessedResult = {
          type: 'summary',
          content: event.data.content,
          complete: event.data.complete
        };
        
        const updatedResults = existingSummaryIndex >= 0 
          ? prev.map((r, i) => i === existingSummaryIndex ? newResult : r)
          : [newResult, ...prev];
        
        console.log('Updated results after summary:', updatedResults);
        return updatedResults;
      });
    } else if (event.type === 'question') {
      console.log('Processing question event:', event.data);
      setResults(prev => {
        const existingQuestionIndex = prev.findIndex(r => 
          r.type === 'question' && r.questionId === event.data.questionId
        );
        
        const newResult: ProcessedResult = {
          type: 'question',
          content: event.data.answer,
          questionId: event.data.questionId,
          question: event.data.question,
          complete: event.data.complete
        };
        
        const updatedResults = existingQuestionIndex >= 0
          ? prev.map((r, i) => i === existingQuestionIndex ? newResult : r)
          : [...prev, newResult];
        
        console.log('Updated results after question:', updatedResults);
        return updatedResults;
      });
    } else if (event.type === 'complete') {
      console.log('Analysis complete event received');
      setStreamingStatus("Complete");
    } else if (event.type === 'error') {
      console.log('Analysis error event received:', event);
      setStreamingStatus("Error");
    } else {
      console.log('Unknown event type received:', event);
    }
  });

  useEffect(() => {
    if (isConnected) {
      setStreamingStatus("Streaming");
    } else if (error) {
      setStreamingStatus("Error");
    } else if (!analysisId) {
      setStreamingStatus("Ready");
    }
  }, [isConnected, error, analysisId]);

  useEffect(() => {
    if (!analysisId) {
      setResults([]);
      setStreamingStatus("Ready");
      setSkeletonStatus({ phase: 'idle', message: '' });
    }
  }, [analysisId]);

  const handleDownload = () => {
    const lines: string[] = [];
    lines.push("MIND PROBE — ANALYSIS REPORT");
    lines.push("=".repeat(60));
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");

    results.forEach((result) => {
      if (result.type === 'summary') {
        lines.push("TEXT SUMMARY & CATEGORIZATION");
        lines.push("-".repeat(40));
        lines.push(result.content.trim());
        lines.push("");
      } else {
        lines.push(`Q: ${result.question || ''}`);
        lines.push("-".repeat(40));
        lines.push(result.content.trim());
        lines.push("");
      }
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-probe-analysis-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    switch (streamingStatus) {
      case "Streaming": return "bg-success-green";
      case "Complete": return "bg-blue-500";
      case "Error": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const FINGERPRINT_FIELDS = ['Theoretical Power', 'Demonstrative Execution', 'Final Intelligence Score', 'Fingerprint Sentences', 'Analysis', 'Cognitive Characteristics'];

  const formatContent = (content: string) => {
    const cleanContent = content
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/```([^`]*)```/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[\-\*\+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .trim();

    return cleanContent
      .split('\n')
      .map((line, index) => {
        const trimmedLine = line.trim();

        // Cognitive fingerprint score lines — Theoretical Power / Demonstrative Execution / Final Intelligence Score
        const scoreMatch = trimmedLine.match(/^(Theoretical Power|Demonstrative Execution|Final Intelligence Score):\s*(\d+)\/100/);
        if (scoreMatch) {
          const label = scoreMatch[1];
          const score = parseInt(scoreMatch[2]);
          const isFinal = label === 'Final Intelligence Score';
          const scoreColor = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600';
          return (
            <div key={index} className={`mt-2 p-3 rounded-lg border-l-4 ${isFinal ? 'bg-blue-50 border-blue-500 mt-4' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <span className={`${isFinal ? 'font-bold text-gray-800' : 'text-gray-600'} flex-1 text-sm`}>{label}</span>
                <span className={`font-bold ${isFinal ? 'text-3xl' : 'text-xl'} ${scoreColor} ml-4`}>{score}/100</span>
              </div>
            </div>
          );
        }

        // Cognitive fingerprint labeled fields
        const fieldMatch = trimmedLine.match(/^(Fingerprint Sentences|Cognitive Characteristics):\s*(.*)/s);
        if (fieldMatch) {
          const fieldLabel = fieldMatch[1];
          const fieldValue = fieldMatch[2].trim();
          const isFingerprint = fieldLabel === 'Fingerprint Sentences';
          return (
            <div key={index} className={`mt-4 p-3 rounded-lg border ${isFingerprint ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isFingerprint ? 'text-indigo-600' : 'text-gray-500'}`}>{fieldLabel}</p>
              {isFingerprint && fieldValue !== 'None detected.' ? (
                <blockquote className="border-l-4 border-indigo-400 pl-3 italic text-indigo-800 text-sm">{fieldValue}</blockquote>
              ) : (
                <p className="text-sm text-gray-700">{fieldValue || 'None detected.'}</p>
              )}
            </div>
          );
        }

        // Analysis: field (multi-line, just strip label and show)
        if (trimmedLine.startsWith('Analysis:')) {
          const value = trimmedLine.slice('Analysis:'.length).trim();
          return (
            <div key={index} className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Analysis</p>
              <p className="text-gray-700 leading-relaxed text-sm">{value}</p>
            </div>
          );
        }

        // Standard score line (legacy single-score format)
        const legacyScoreMatch = trimmedLine.match(/(\d+)\/100/);
        if (legacyScoreMatch && !FINGERPRINT_FIELDS.some(f => trimmedLine.startsWith(f))) {
          const score = parseInt(legacyScoreMatch[1]);
          const scoreColor = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600';
          const displayLabel = trimmedLine.replace(`${legacyScoreMatch[1]}/100`, '').trim();
          return (
            <div key={index} className="mt-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 flex-1">{displayLabel}</span>
                <span className={`font-bold text-2xl ${scoreColor} ml-4`}>{score}/100</span>
              </div>
            </div>
          );
        }

        if (trimmedLine.startsWith('"') && trimmedLine.endsWith('"')) {
          return (
            <blockquote key={index} className="border-l-4 border-gray-300 pl-4 my-3 italic text-gray-600">
              {trimmedLine}
            </blockquote>
          );
        }
        else if (trimmedLine) {
          return <p key={index} className="text-gray-700 mb-2 leading-relaxed">{line}</p>;
        }
        else {
          return <div key={index} className="mb-2"></div>;
        }
      });
  };

  const renderSkeletonBanner = () => {
    if (skeletonStatus.phase === 'idle') return null;

    if (skeletonStatus.phase === 'extracting') {
      return (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
          <Brain className="h-4 w-4 text-indigo-500 shrink-0" />
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500 shrink-0" />
          <span className="text-sm font-medium">Pass 1 — Extracting document skeleton for cross-chunk coherence…</span>
        </div>
      );
    }

    if (skeletonStatus.phase === 'complete') {
      return (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          <Brain className="h-4 w-4 text-green-600 shrink-0" />
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-sm font-medium">
            Skeleton extracted — {skeletonStatus.documentType}
            {skeletonStatus.isExcerpt ? ' (excerpt — evaluating as introduction)' : ''}
            . All questions will now be calibrated against the document's full intent.
          </span>
        </div>
      );
    }

    if (skeletonStatus.phase === 'failed') {
      return (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm">Skeleton extraction failed — proceeding without global context</span>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={`border-border-light shadow-sm ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="border-b border-border-light p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Real-Time Analysis Results</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${streamingStatus === 'Streaming' ? 'animate-pulse' : ''}`} />
              <span className="text-sm text-gray-600" data-testid="text-streaming-status">{streamingStatus}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={results.length === 0}
              data-testid="button-download"
              className="text-gray-500 hover:text-primary-blue disabled:opacity-30"
              title="Download as .txt"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-testid="button-fullscreen"
              className="text-gray-500 hover:text-primary-blue"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className={`space-y-6 ${isFullscreen ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : 'min-h-96'}`}>
          
          {renderSkeletonBanner()}

          {results.length === 0 && !isStreaming && skeletonStatus.phase === 'idle' && (
            <div className="text-center py-12 text-gray-500">
              <p>No analysis results yet. Start an analysis to see real-time results here.</p>
            </div>
          )}

          {results.map((result, index) => (
            <div 
              key={`${result.type}-${result.questionId || 'summary'}-${index}`}
              className={`analysis-section border-l-4 pl-4 transition-all duration-300 ${
                result.type === 'summary' ? 'border-primary-blue' : 
                result.complete ? 'border-green-400' : 'border-yellow-400 opacity-70'
              }`}
            >
              <h3 className="font-semibold text-lg mb-2">
                {result.type === 'summary' 
                  ? 'Text Summary & Categorization'
                  : result.question || 'Processing...'
                }
              </h3>
              <div className="bg-bg-off-white p-4 rounded-lg">
                <div className={`streaming-content ${result.complete ? 'opacity-100' : 'opacity-70'}`}>
                  {formatContent(result.content)}
                  {!result.complete && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-blue" />
                      <span className="text-sm text-gray-500">Generating response...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isStreaming && results.length > 0 && (
            <div className="analysis-section border-l-4 border-yellow-400 pl-4 opacity-60">
              <h3 className="font-semibold mb-2">Processing next question...</h3>
              <div className="bg-bg-off-white p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-blue" />
                  <span className="text-gray-500">Analyzing response patterns...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

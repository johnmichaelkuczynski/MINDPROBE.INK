import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LLMProvider } from "@/types/analysis";
import { Play, Pause, Square, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ControlPanelProps {
  selectedLLM: LLMProvider;
  onLLMSelect: (llm: LLMProvider) => void;
  onStartAnalysis: () => void;
  onPauseAnalysis: () => void;
  onStopAnalysis: () => void;
  onDownload: () => void;
  isAnalyzing: boolean;
  progress: number;
  questionsProcessed: number;
  totalQuestions: number;
  currentPhase: string;
  estimatedTime: string;
  canDownload: boolean;
}

const llmOptions = [
  { id: 'zhi1' as LLMProvider, name: 'ZHI 1', description: 'Primary analysis engine' },
  { id: 'zhi2' as LLMProvider, name: 'ZHI 2', description: 'Alternative reasoning model' },
  { id: 'zhi3' as LLMProvider, name: 'ZHI 3', description: 'Specialized profiling engine' },
  { id: 'zhi4' as LLMProvider, name: 'ZHI 4', description: 'Research-focused model' },
];

export function ControlPanel({
  selectedLLM,
  onLLMSelect,
  onStartAnalysis,
  onPauseAnalysis,
  onStopAnalysis,
  onDownload,
  isAnalyzing,
  progress,
  questionsProcessed,
  totalQuestions,
  currentPhase,
  estimatedTime,
  canDownload
}: ControlPanelProps) {
  const { toast } = useToast();

  const handleCopyToClipboard = async () => {
    try {
      // This would copy the current analysis results
      await navigator.clipboard.writeText("Analysis results would be copied here");
      toast({
        title: "Copied to clipboard",
        description: "Analysis results have been copied",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* LLM Selection */}
      <Card className="border-border-light shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">LLM Selection</h3>
          <div className="space-y-3">
            {llmOptions.map((option) => (
              <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="llm"
                  value={option.id}
                  checked={selectedLLM === option.id}
                  onChange={() => onLLMSelect(option.id)}
                  className="w-4 h-4 text-primary-blue border-border-light focus:ring-primary-blue"
                  data-testid={`radio-llm-${option.id}`}
                />
                <div className="flex-1">
                  <span className="font-medium">{option.name}</span>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Controls */}
      <Card className="border-border-light shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Analysis Controls</h3>
          <div className="space-y-4">
            <Button
              onClick={onStartAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-primary-blue text-white hover:bg-blue-700"
              data-testid="button-start-analysis"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
            
            <Button
              onClick={onPauseAnalysis}
              disabled={!isAnalyzing}
              variant="secondary"
              className="w-full"
              data-testid="button-pause-analysis"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Analysis
            </Button>
            
            <Button
              onClick={onStopAnalysis}
              disabled={!isAnalyzing}
              variant="destructive"
              className="w-full"
              data-testid="button-stop-analysis"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <Card className="border-border-light shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Progress</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Questions Processed</span>
              <span data-testid="text-questions-progress">{questionsProcessed} / {totalQuestions}</span>
            </div>
            <Progress value={progress} className="w-full" data-testid="progress-bar" />
            
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Current Phase:</span>
                <span data-testid="text-current-phase">{currentPhase}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Estimated Time:</span>
                <span data-testid="text-estimated-time">{estimatedTime}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="border-border-light shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Export Results</h3>
          <div className="space-y-3">
            <Button
              onClick={onDownload}
              disabled={!canDownload}
              className="w-full bg-success-green text-white hover:bg-green-600"
              data-testid="button-download-txt"
            >
              <Download className="h-4 w-4 mr-2" />
              Download as TXT
            </Button>
            
            <Button
              onClick={handleCopyToClipboard}
              disabled={!canDownload}
              variant="secondary"
              className="w-full"
              data-testid="button-copy-clipboard"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

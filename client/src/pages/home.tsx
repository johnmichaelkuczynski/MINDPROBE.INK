import { useState, useEffect } from "react";
import { AnalysisSelector } from "@/components/AnalysisSelector";
import { InputSection } from "@/components/InputSection";
import { ControlPanel } from "@/components/ControlPanel";
import { RealTimeResults } from "@/components/RealTimeResults";
import { DialogueSystem } from "@/components/DialogueSystem";
import { ChunkSelector } from "@/components/ChunkSelector";
import { AnalysisType, LLMProvider } from "@/types/analysis";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useToast } from "@/hooks/use-toast";
import { Brain, HelpCircle, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextChunkingService, TextChunk } from "@shared/textUtils";

export default function Home() {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>('cognitive');
  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>('zhi1');
  const [inputText, setInputText] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [questionsProcessed, setQuestionsProcessed] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("Ready");
  const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
  const [showChunkSelector, setShowChunkSelector] = useState(false);
  
  const { toast } = useToast();
  const {
    currentAnalysisId,
    startAnalysis,
    uploadFile,
    dialogue,
    sendDialogue,
    regenerateAnalysis,
    downloadAnalysis,
    clearCurrentAnalysis,
    isStarting,
    isUploading,
  } = useAnalysis();

  const totalQuestions = 18; // This would vary based on analysis type

  const handleStartAnalysis = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Text required",
        description: "Please enter text or upload a file before starting analysis",
        variant: "destructive",
      });
      return;
    }

    // Check if text needs chunking
    if (TextChunkingService.needsChunking(inputText)) {
      const chunks = TextChunkingService.createChunks(inputText);
      setTextChunks(chunks);
      setShowChunkSelector(true);
      return;
    }

    // Proceed with analysis
    await performAnalysis(inputText);
  };

  const performAnalysis = async (textToAnalyze: string) => {
    try {
      await startAnalysis.mutateAsync({
        analysisType: selectedAnalysisType,
        llmProvider: selectedLLM,
        inputText: textToAnalyze,
        additionalContext: additionalContext || undefined,
      });
      
      setIsAnalyzing(true);
      setProgress(0);
      setQuestionsProcessed(0);
      setCurrentPhase("Starting Analysis");
      
      toast({
        title: "Analysis started",
        description: "Your analysis is now running. Watch the real-time results below.",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Failed to start analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChunksProceed = async () => {
    const selectedText = TextChunkingService.getSelectedChunksText(textChunks);
    setShowChunkSelector(false);
    await performAnalysis(selectedText);
  };

  const handleChunksCancel = () => {
    setShowChunkSelector(false);
    setTextChunks([]);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadFile.mutateAsync(file);
      setInputText(result.text);
      toast({
        title: "File uploaded",
        description: `Successfully extracted text from ${file.name}`,
      });

      // Check if uploaded text needs chunking
      if (TextChunkingService.needsChunking(result.text)) {
        toast({
          title: "Large file detected",
          description: "The uploaded text is longer than 1000 words. You'll need to select chunks before analysis.",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendDialogue = async (message: string) => {
    if (!currentAnalysisId) return;
    
    try {
      await sendDialogue.mutateAsync({
        analysisId: currentAnalysisId,
        message,
      });
    } catch (error) {
      toast({
        title: "Message failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateAnalysis = async (concerns: string) => {
    if (!currentAnalysisId) return;
    
    try {
      await regenerateAnalysis.mutateAsync({
        analysisId: currentAnalysisId,
        concerns,
      });
      
      toast({
        title: "Analysis regenerating",
        description: "A new analysis is being generated with your concerns addressed.",
      });
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: "Failed to regenerate analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!currentAnalysisId) return;
    
    try {
      await downloadAnalysis(currentAnalysisId);
      toast({
        title: "Download started",
        description: "Your analysis report is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewAnalysis = () => {
    // Reset all state for a fresh analysis
    setInputText("");
    setAdditionalContext("");
    setIsAnalyzing(false);
    setProgress(0);
    setQuestionsProcessed(0);
    setCurrentPhase("Ready");
    setTextChunks([]);
    setShowChunkSelector(false);
    
    // Clear the current analysis results
    clearCurrentAnalysis();
    
    toast({
      title: "New analysis ready",
      description: "All fields and results have been cleared for a new analysis.",
    });
  };

  // Simulate progress updates (in real implementation, this would come from SSE)
  useEffect(() => {
    if (isAnalyzing && questionsProcessed < totalQuestions) {
      const interval = setInterval(() => {
        setQuestionsProcessed(prev => {
          const next = Math.min(prev + 1, totalQuestions);
          setProgress((next / totalQuestions) * 100);
          
          if (next === totalQuestions) {
            setIsAnalyzing(false);
            setCurrentPhase("Complete");
          } else {
            setCurrentPhase(`Processing Question ${next + 1}`);
          }
          
          return next;
        });
      }, 5000); // Simulate 5 seconds per question
      
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, questionsProcessed, totalQuestions]);

  const estimatedTimeRemaining = isAnalyzing 
    ? `${Math.ceil(((totalQuestions - questionsProcessed) * 5) / 60)} min`
    : "--";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="text-primary-blue text-2xl h-8 w-8" />
              <h1 className="text-2xl font-bold text-text-primary">Mind Reader</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Cognitive Profiler
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleNewAnalysis}
                variant="outline" 
                size="sm" 
                className="text-primary-blue border-primary-blue hover:bg-primary-blue hover:text-white"
                data-testid="button-new-analysis"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary-blue">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary-blue">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chunk Selector Modal */}
      {showChunkSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <ChunkSelector
            chunks={textChunks}
            onChunksChange={setTextChunks}
            onProceed={handleChunksProceed}
            onCancel={handleChunksCancel}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analysis Selector */}
        <div className="mb-8">
          <AnalysisSelector
            selectedType={selectedAnalysisType}
            onTypeSelect={setSelectedAnalysisType}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="xl:col-span-2">
            <InputSection
              inputText={inputText}
              onTextChange={setInputText}
              additionalContext={additionalContext}
              onContextChange={setAdditionalContext}
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
            />
          </div>

          {/* Control Panel */}
          <div>
            <ControlPanel
              selectedLLM={selectedLLM}
              onLLMSelect={setSelectedLLM}
              onStartAnalysis={handleStartAnalysis}
              onPauseAnalysis={() => setIsAnalyzing(false)}
              onStopAnalysis={() => {
                setIsAnalyzing(false);
                setProgress(0);
                setQuestionsProcessed(0);
                setCurrentPhase("Stopped");
              }}
              onDownload={handleDownload}
              isAnalyzing={isStarting || isAnalyzing}
              progress={progress}
              questionsProcessed={questionsProcessed}
              totalQuestions={totalQuestions}
              currentPhase={currentPhase}
              estimatedTime={estimatedTimeRemaining}
              canDownload={!isAnalyzing && questionsProcessed > 0}
            />
          </div>
        </div>

        {/* Real-Time Results */}
        <div className="mt-8">
          <RealTimeResults
            analysisId={currentAnalysisId}
            isStreaming={isAnalyzing}
          />
        </div>

        {/* Dialogue System */}
        <div className="mt-8">
          <DialogueSystem
            analysisId={currentAnalysisId}
            messages={dialogue || []}
            onSendMessage={handleSendDialogue}
            onRegenerateAnalysis={handleRegenerateAnalysis}
            isSending={sendDialogue.isPending}
          />
        </div>
      </div>
    </div>
  );
}

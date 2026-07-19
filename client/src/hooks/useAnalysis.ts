import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AnalysisConfig, AnalysisResult, DialogueMessage } from '@/types/analysis';

export function useAnalysis() {
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  const startAnalysisMutation = useMutation({
    mutationFn: async (config: AnalysisConfig) => {
      const response = await apiRequest('POST', '/api/analysis/start', config);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAnalysisId(data.analysisId);
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('File upload failed');
      }
      
      return response.json();
    }
  });

  const analysisQuery = useQuery({
    queryKey: ['/api/analysis', currentAnalysisId],
    enabled: !!currentAnalysisId,
  });

  const dialogueQuery = useQuery({
    queryKey: ['/api/analysis', currentAnalysisId, 'dialogue'],
    enabled: !!currentAnalysisId,
  });

  const sendDialogueMutation = useMutation({
    mutationFn: async ({ analysisId, message }: { analysisId: string; message: string }) => {
      const response = await apiRequest('POST', `/api/analysis/${analysisId}/dialogue`, { message });
      return response.json();
    },
    onSuccess: () => {
      // Refetch dialogue messages
      dialogueQuery.refetch();
    }
  });

  const regenerateAnalysisMutation = useMutation({
    mutationFn: async ({ analysisId, concerns }: { analysisId: string; concerns: string }) => {
      const response = await apiRequest('POST', `/api/analysis/${analysisId}/regenerate`, { concerns });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAnalysisId(data.analysisId);
    }
  });

  const clearCurrentAnalysis = () => {
    setCurrentAnalysisId(null);
  };

  const downloadAnalysis = async (analysisId: string) => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${analysisId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  };

  return {
    currentAnalysisId,
    setCurrentAnalysisId,
    startAnalysis: startAnalysisMutation,
    uploadFile: uploadFileMutation,
    analysis: analysisQuery.data as AnalysisResult | undefined,
    dialogue: dialogueQuery.data as DialogueMessage[] | undefined,
    sendDialogue: sendDialogueMutation,
    regenerateAnalysis: regenerateAnalysisMutation,
    downloadAnalysis,
    clearCurrentAnalysis,
    isStarting: startAnalysisMutation.isPending,
    isUploading: uploadFileMutation.isPending,
  };
}

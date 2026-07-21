export type AnalysisType = 
  | 'micro-cognitive'
  | 'cognitive' 
  | 'comprehensive-cognitive' 
  | 'micro-psychological'
  | 'psychological' 
  | 'comprehensive-psychological' 
  | 'micro-psychopathological'
  | 'psychopathological' 
  | 'comprehensive-psychopathological'
  | 'micro-cognitive-duo'
  | 'cognitive-duo'
  | 'comprehensive-cognitive-duo'
  | 'micro-psychological-duo'
  | 'psychological-duo'
  | 'comprehensive-psychological-duo'
  | 'micro-psychopathological-duo'
  | 'psychopathological-duo'
  | 'comprehensive-psychopathological-duo';

export function isDuoType(t: AnalysisType): boolean {
  return t.endsWith('-duo');
}

export function toBaseType(t: AnalysisType): AnalysisType {
  return (t.endsWith('-duo') ? t.slice(0, -4) : t) as AnalysisType;
}

export type LLMProvider = "zhi1" | "zhi2" | "zhi3" | "zhi4" | "zhi5";

export interface AnalysisConfig {
  analysisType: AnalysisType;
  llmProvider: LLMProvider;
  inputText: string;
  additionalContext?: string;
}

export interface AnalysisResult {
  id: string;
  analysisType: AnalysisType;
  llmProvider: LLMProvider;
  inputText: string;
  additionalContext?: string;
  results: any[];
  status: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface StreamEvent {
  type: 'skeleton' | 'summary' | 'question' | 'complete' | 'error';
  data: any;
}

export interface DialogueMessage {
  id: string;
  analysisId: string;
  sender: 'user' | 'system';
  message: string;
  createdAt: Date;
}

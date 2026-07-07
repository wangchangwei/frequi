/**
 * AI Analysis Center Types
 * Phase 5: LLM-powered analysis of backtest results and trading performance
 */

export type AnalysisType = 'strategy' | 'trade' | 'performance' | 'risk';
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AiAnalysisRequest {
  id: string;
  type: AnalysisType;
  targetId?: string; // strategy ID, trade ID, or bot ID
  model: string; // e.g. 'gpt-4o-mini'
  prompt?: string; // custom prompt override
  status: AnalysisStatus;
  result?: AiAnalysisResult;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AiAnalysisResult {
  summary: string; // natural language summary
  score?: number; // 0-100
  tags?: string[]; // e.g. ['high-risk', 'momentum']
  insights: AiInsight[];
  recommendations: string[];
}

export type InsightCategory = 'strength' | 'weakness' | 'observation' | 'alert';

export interface AiInsight {
  category: InsightCategory;
  text: string;
  confidence: number; // 0-1
}

export type ModelProvider = 'openai' | 'anthropic' | 'local';

export interface AiModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  maxTokens: number;
}

// Default available models (hardcoded - freqtrade doesn't expose model listing)
export const defaultModels: AiModelInfo[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', maxTokens: 16384 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', maxTokens: 128000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', maxTokens: 128000 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', maxTokens: 16385 },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', maxTokens: 200000 },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', maxTokens: 200000 },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', maxTokens: 200000 },
  { id: 'o1-mini', name: 'o1 Mini', provider: 'openai', maxTokens: 65536 },
  { id: 'o1-preview', name: 'o1 Preview', provider: 'openai', maxTokens: 65536 },
];

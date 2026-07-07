/**
 * AI Analysis Store
 * Phase 5: LLM-powered analysis of backtest results and trading performance
 */
import { defineStore } from 'pinia';
import { acceptHMRUpdate } from 'pinia';
import type {
  AiAnalysisRequest,
  AiAnalysisResult,
  AiInsight,
  AiModelInfo,
  AnalysisType,
} from '@/types/aiAnalysis';
import { defaultModels } from '@/types/aiAnalysis';

const API_KEY_STORAGE_KEY = 'frequi_ai_api_key';

export const useAiAnalysisStore = defineStore(
  'aiAnalysis',
  () => {
    // ==================== State ====================
    const analysisHistory = ref<AiAnalysisRequest[]>([]);
    const activeAnalysis = ref<AiAnalysisRequest | null>(null);
    const availableModels = ref<AiModelInfo[]>(defaultModels);

    // ==================== API Key ====================
    function getApiKey(): string | null {
      return localStorage.getItem(API_KEY_STORAGE_KEY);
    }

    function setApiKey(key: string): void {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    }

    function clearApiKey(): void {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }

    // ==================== Model Management ====================
    function fetchAvailableModels(): void {
      // freqtrade doesn't expose model listing, use defaults
      availableModels.value = defaultModels;
    }

    // ==================== Analysis Creation ====================
    function createAnalysis(
      type: AnalysisType,
      targetId: string | undefined,
      model: string,
      prompt?: string,
    ): AiAnalysisRequest {
      const request: AiAnalysisRequest = {
        id: crypto.randomUUID(),
        type,
        targetId,
        model,
        prompt,
        status: 'pending',
        createdAt: Date.now(),
      };
      analysisHistory.value.unshift(request);
      return request;
    }

    // ==================== LLM API Call ====================
    async function callLlm(
      model: string,
      systemPrompt: string,
      userPrompt: string,
      apiKey: string,
    ): Promise<string> {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }

    // ==================== Build Analysis Prompts ====================
    function buildSystemPrompt(type: AnalysisType): string {
      const prompts: Record<AnalysisType, string> = {
        strategy: `You are an expert trading strategy analyst. Analyze the provided strategy parameters and backtest results.
Provide a detailed assessment including:
1. A summary of the strategy's approach and philosophy
2. Key strengths and potential weaknesses
3. Risk-adjusted performance metrics interpretation
4. Actionable recommendations for improvement
Format your response with clear sections. Extract a score (0-100) for overall quality.
Extract tags in [bracketed] format like [momentum] [mean-reversion] [high-risk].
Provide insights categorized as: strength, weakness, observation, or alert.`,
        trade: `You are an expert trade analyst. Analyze the provided trade history and patterns.
Identify:
1. Entry and exit quality patterns
2. Common exit reasons and their implications
3. Win/loss patterns and their causes
4. Recommendations for improving trade execution
Format your response with clear sections. Extract a score (0-100) for trade quality.
Extract tags in [bracketed] format. Provide insights categorized appropriately.`,
        performance: `You are an expert in trading performance analysis. Analyze overall trading performance metrics.
Evaluate:
1. Profitability trends and consistency
2. Risk-adjusted returns (Sharpe, drawdown)
3. Performance across different market conditions
4. Recommendations for improving overall performance
Format your response with clear sections. Extract a score (0-100) for performance.
Extract tags in [bracketed] format. Provide insights categorized appropriately.`,
        risk: `You are an expert in trading risk management. Analyze current risk exposure and conditions.
Assess:
1. Current position exposure and margin usage
2. Unusual market conditions or patterns
3. Potential risk scenarios and their likelihood
4. Recommendations for risk management
Format your response with clear sections. Extract a score (0-100) for risk posture (higher = safer).
Extract tags in [bracketed] format like [high-risk] [low-exposure]. Provide insights categorized appropriately.`,
      };
      return prompts[type];
    }

    async function buildUserPrompt(
      type: AnalysisType,
      targetId: string | undefined,
    ): Promise<string> {
      const botStore = useBotStore();
      const bot = botStore.activeBot;

      switch (type) {
        case 'strategy': {
          // Fetch strategy details and recent backtest results
          try {
            // Get strategy list
            await bot.getStrategyList();
            const strategyData = bot.strategy || {};

            // Get backtest history
            try {
              await bot.getBacktestHistory();
            } catch {
              // Backtest history may not be available
            }

            return `Analyze this trading strategy:

Strategy Name: ${targetId || 'Unknown'}
Strategy Parameters: ${JSON.stringify(strategyData, null, 2)}

Backtest History Keys: ${Object.keys(bot.backtestHistory || {}).join(', ') || 'None'}

Provide a comprehensive analysis.`;
          } catch {
            return `Analyze trading strategy: ${targetId || 'Unknown'}. No detailed data available.`;
          }
        }

        case 'trade': {
          // Fetch recent trades
          try {
            await bot.getTrades();
            const trades = bot.trades || [];

            return `Analyze recent trades:

Total Trades: ${Array.isArray(trades) ? trades.length : 'Unknown'}
Trades Data: ${JSON.stringify(trades.slice(0, 50), null, 2)}

Provide a comprehensive trade analysis.`;
          } catch {
            return `Analyze trades. Target ID: ${targetId || 'All trades'}. No detailed data available.`;
          }
        }

        case 'performance': {
          // Fetch profit, status, performance data
          try {
            const [profitResult, perfResult] = await Promise.allSettled([
              bot.getProfit(),
              bot.getPerformance(),
            ]);

            const profit = profitResult.status === 'fulfilled' ? profitResult.value : {};
            const performance = perfResult.status === 'fulfilled' ? perfResult.value : {};

            return `Analyze overall trading performance:

Profit Stats: ${JSON.stringify(profit, null, 2)}
Performance Data: ${JSON.stringify(performance, null, 2)}

Provide a comprehensive performance analysis.`;
          } catch {
            return `Analyze trading performance. No detailed data available.`;
          }
        }

        case 'risk': {
          // Fetch balance, locks, trade data
          try {
            const [balanceResult, locksResult, openTradesResult] = await Promise.allSettled([
              bot.getBalance(),
              bot.getLocks(),
              bot.getOpenTrades(),
            ]);

            const balance = balanceResult.status === 'fulfilled' ? balanceResult.value : {};
            const locks = locksResult.status === 'fulfilled' ? locksResult.value : {};
            const openTrades =
              openTradesResult.status === 'fulfilled' ? openTradesResult.value : [];

            return `Analyze current risk exposure:

Balance: ${JSON.stringify(balance, null, 2)}
Pair Locks: ${JSON.stringify(locks, null, 2)}
Open Trades Count: ${Array.isArray(openTrades) ? openTrades.length : 0}

Provide a comprehensive risk analysis.`;
          } catch {
            return `Analyze risk exposure. No detailed data available.`;
          }
        }

        default:
          return `Analyze ${type} for target ${targetId || 'Unknown'}.`;
      }
    }

    // ==================== Parse LLM Response ====================
    function parseLlamaResponse(text: string, _type: AnalysisType): AiAnalysisResult {
      const result: AiAnalysisResult = {
        summary: text,
        insights: [],
        recommendations: [],
      };

      // Extract score from various patterns
      const scorePatterns = [
        /score:\s*(\d+)/i,
        /rating:\s*(\d+)(?:\/10)?/i,
        /overall:\s*(\d+)(?:%)?/i,
        /assessment:\s*(\d+)/i,
        /quality:\s*(\d+)/i,
      ];

      for (const pattern of scorePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.score = Math.min(100, Math.max(0, parseInt(match[1], 10)));
          break;
        }
      }

      // Extract tags from [bracketed] items
      const tagMatches = text.match(/\[([^\]]+)\]/g);
      if (tagMatches) {
        result.tags = tagMatches.map((tag) => tag.slice(1, -1).toLowerCase().trim());
      }

      // Parse lines into insights and recommendations
      const lines = text.split('\n');
      let currentCategory: AiInsight['category'] = 'observation';
      const currentInsights: string[] = [];
      const currentRecommendations: string[] = [];
      let inRecommendationSection = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Detect section headers
        if (
          trimmedLine.toLowerCase().startsWith('## ') ||
          trimmedLine.toLowerCase().startsWith('### ')
        ) {
          const sectionTitle = trimmedLine.replace(/^#+\s*/, '').toLowerCase();
          if (sectionTitle.includes('recommend')) {
            inRecommendationSection = true;
          } else {
            inRecommendationSection = false;
          }
          continue;
        }

        // Detect insight categories
        if (
          trimmedLine.toLowerCase().startsWith('**strength') ||
          trimmedLine.includes('[strength]')
        ) {
          currentCategory = 'strength';
          const insightText = trimmedLine
            .replace(/\*\*|\[|\]/g, '')
            .replace(/strength:*/i, '')
            .trim();
          if (insightText) currentInsights.push(insightText);
          continue;
        }
        if (
          trimmedLine.toLowerCase().startsWith('**weakness') ||
          trimmedLine.includes('[weakness]')
        ) {
          currentCategory = 'weakness';
          const insightText = trimmedLine
            .replace(/\*\*|\[|\]/g, '')
            .replace(/weakness:*/i, '')
            .trim();
          if (insightText) currentInsights.push(insightText);
          continue;
        }
        if (trimmedLine.toLowerCase().startsWith('**alert') || trimmedLine.includes('[alert]')) {
          currentCategory = 'alert';
          const insightText = trimmedLine
            .replace(/\*\*|\[|\]/g, '')
            .replace(/alert:*/i, '')
            .trim();
          if (insightText) currentInsights.push(insightText);
          continue;
        }

        // Parse list items
        const listMatch = trimmedLine.match(/^[-*]\s*(.+)/);
        const numberedMatch = trimmedLine.match(/^\d+\.\s*(.+)/);

        if (listMatch || numberedMatch) {
          const itemText = (listMatch?.[1] || numberedMatch?.[1] || '').trim();

          if (inRecommendationSection || trimmedLine.toLowerCase().includes('recommend')) {
            currentRecommendations.push(itemText);
          } else {
            currentInsights.push(itemText);
          }
        } else if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.length > 10) {
          // General text lines as observations
          if (!inRecommendationSection && !trimmedLine.startsWith('**')) {
            currentInsights.push(trimmedLine);
          }
        }
      }

      // Convert insights strings to AiInsight objects
      result.insights = currentInsights.slice(0, 10).map((text) => ({
        category: currentCategory,
        text,
        confidence: 0.7 + Math.random() * 0.25, // Simulated confidence
      }));

      result.recommendations = currentRecommendations.slice(0, 5);

      // Ensure we have at least one recommendation
      if (result.recommendations.length === 0 && result.insights.length > 0) {
        const lastInsight = result.insights[result.insights.length - 1];
        if (lastInsight) {
          result.recommendations.push(`Investigate: ${lastInsight.text}`);
        }
      }

      return result;
    }

    // ==================== Run Analysis ====================
    async function runAnalysis(id: string): Promise<void> {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error('No API key configured. Please set your OpenAI API key.');
      }

      const analysis = analysisHistory.value.find((a) => a.id === id);
      if (!analysis) {
        throw new Error('Analysis not found');
      }

      // Mark as running
      analysis.status = 'running';
      activeAnalysis.value = analysis;

      try {
        // Build prompts
        const systemPrompt = buildSystemPrompt(analysis.type);
        const userPrompt = await buildUserPrompt(analysis.type, analysis.targetId);

        // Combine custom prompt if provided
        const finalUserPrompt = analysis.prompt
          ? `${userPrompt}\n\nAdditional context from user:\n${analysis.prompt}`
          : userPrompt;

        // Call LLM
        const response = await callLlm(analysis.model, systemPrompt, finalUserPrompt, apiKey);

        // Parse response
        const result = parseLlamaResponse(response, analysis.type);

        // Update analysis
        analysis.result = result;
        analysis.status = 'completed';
        analysis.completedAt = Date.now();
      } catch (error) {
        analysis.status = 'failed';
        analysis.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        if (activeAnalysis.value?.id === id) {
          activeAnalysis.value = null;
        }
      }
    }

    // ==================== History Management ====================
    function deleteAnalysis(id: string): void {
      analysisHistory.value = analysisHistory.value.filter((a) => a.id !== id);
      if (activeAnalysis.value?.id === id) {
        activeAnalysis.value = null;
      }
    }

    function clearHistory(): void {
      analysisHistory.value = [];
      activeAnalysis.value = null;
    }

    function getAnalysisById(id: string): AiAnalysisRequest | undefined {
      return analysisHistory.value.find((a) => a.id === id);
    }

    // ==================== Cancel Analysis ====================
    function cancelAnalysis(): void {
      if (activeAnalysis.value) {
        activeAnalysis.value.status = 'failed';
        activeAnalysis.value.error = 'Cancelled by user';
        activeAnalysis.value = null;
      }
    }

    return {
      // State
      analysisHistory,
      activeAnalysis,
      availableModels,
      // API Key
      getApiKey,
      setApiKey,
      clearApiKey,
      // Model Management
      fetchAvailableModels,
      // Analysis
      createAnalysis,
      runAnalysis,
      deleteAnalysis,
      clearHistory,
      getAnalysisById,
      cancelAnalysis,
    };
  },
  {
    persist: {
      pick: ['analysisHistory'],
    },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAiAnalysisStore, import.meta.hot));
}

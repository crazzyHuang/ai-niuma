/**
 * 🔍 动态场景分析器
 * 
 * 从数据库中加载场景分析AI配置，支持灵活切换提供商和模型
 * 替代原有的硬编码场景分析实现
 */

import prisma from './db';
import llmService from './llm-service';
import { LLMConfig, LLMMessage } from '@/types/llm';

export interface SceneAnalysisInput {
  message: string;
  history: any[];
  availableAgents: any[];
  context?: {
    timeOfDay?: string;
    conversationType?: string;
    userProfile?: any;
  };
}

export interface SceneAnalysisResult {
  sceneType: string;
  emotion: string;
  topics: string[];
  confidence: number;
  participantSuggestions: string[];
  reasoning?: string;
  metadata?: {
    analyzerId: string;
    provider: string;
    model: string;
    processingTime: number;
  };
}

class DynamicSceneAnalyzer {
  private activeAnalyzer: any = null;
  private lastLoadTime: number = 0;
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取活跃的场景分析器配置
   */
  private async getActiveAnalyzer(): Promise<any> {
    const now = Date.now();
    
    // 缓存有效，直接返回
    if (this.activeAnalyzer && (now - this.lastLoadTime) < this.cacheExpiry) {
      return this.activeAnalyzer;
    }

    try {
      const analyzer = await prisma.sceneAnalyzer.findFirst({
        where: { isActive: true },
        include: {
          provider: true,
          model: true
        }
      });

      if (!analyzer) {
        throw new Error('没有找到活跃的场景分析器配置');
      }

      if (!analyzer.provider.isActive) {
        throw new Error(`场景分析器的提供商 ${analyzer.provider.name} 未激活`);
      }

      if (!analyzer.model.isActive) {
        throw new Error(`场景分析器的模型 ${analyzer.model.name} 未激活`);
      }

      this.activeAnalyzer = analyzer;
      this.lastLoadTime = now;
      
      console.log(`🔍 [场景分析器] 已加载: ${analyzer.name} (${analyzer.provider.name}/${analyzer.model.name})`);
      return analyzer;

    } catch (error) {
      console.error('❌ [场景分析器] 加载配置失败:', error);
      throw error;
    }
  }

  /**
   * 构建LLM配置
   */
  private buildLLMConfig(analyzer: any): LLMConfig {
    return {
      provider: analyzer.provider.code as any,
      model: analyzer.model.code,
      apiKey: analyzer.provider.apiKey,
      baseUrl: analyzer.provider.baseUrl,
      temperature: analyzer.temperature,
      maxTokens: analyzer.maxTokens
    };
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(input: SceneAnalysisInput, analyzer: any): LLMMessage[] {
    const { message, history, availableAgents, context } = input;

    // 构建历史记录上下文
    const historyContext = history.slice(-5).map(msg => 
      `${msg.role === 'user' ? '用户' : msg.agent || 'AI'}: ${msg.content}`
    ).join('\n');

    // 构建可用智能体信息
    const availableAgentInfo = availableAgents.map(agent => 
      `- ${agent.name} (${agent.roleTag}): ${agent.prompt?.substring(0, 100) || '专业智能体'}...`
    ).join('\n');

    // 构建完整的分析消息
    const analysisContent = `
【用户当前消息】
${message}

【对话历史】
${historyContext || '暂无历史记录'}

【可用智能体】
${availableAgentInfo}

【上下文信息】
${context ? JSON.stringify(context, null, 2) : '暂无额外上下文'}

请分析这个对话场景并以JSON格式回复。`.trim();

    return [
      {
        role: 'system',
        content: analyzer.systemPrompt
      },
      {
        role: 'user',
        content: analysisContent
      }
    ];
  }

  /**
   * 解析AI返回结果
   */
  private parseAnalysisResult(response: string, analyzer: any, processingTime: number): SceneAnalysisResult {
    try {
      // 提取JSON部分（如果响应包含其他文本）
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      
      const parsed = JSON.parse(jsonStr);

      return {
        sceneType: parsed.sceneType || 'casual_chat',
        emotion: parsed.emotion || 'neutral',
        topics: Array.isArray(parsed.topics) ? parsed.topics : [parsed.topic || '一般对话'].filter(Boolean),
        confidence: parsed.confidence || 0.8,
        participantSuggestions: Array.isArray(parsed.participantSuggestions) 
          ? parsed.participantSuggestions 
          : [parsed.suggestedAgent || 'EMPATHY'].filter(Boolean),
        reasoning: parsed.reasoning || '基于消息内容进行的自动分析',
        metadata: {
          analyzerId: analyzer.id,
          provider: analyzer.provider.name,
          model: analyzer.model.name,
          processingTime
        }
      };

    } catch (parseError) {
      console.warn('⚠️ [场景分析器] JSON解析失败，使用默认结果:', parseError);
      
      // 如果解析失败，返回基于规则的默认分析
      return this.getFallbackAnalysis(response, analyzer, processingTime);
    }
  }

  /**
   * 基于规则的回退分析
   */
  private getFallbackAnalysis(response: string, analyzer: any, processingTime: number): SceneAnalysisResult {
    const message = response.toLowerCase();
    
    // 简单的情感分析
    let emotion = 'neutral';
    if (/开心|高兴|快乐|哈哈/.test(message)) emotion = 'positive';
    else if (/难过|伤心|沮丧|担心/.test(message)) emotion = 'negative';
    else if (/担心|紧张|焦虑/.test(message)) emotion = 'worried';
    else if (/兴奋|激动/.test(message)) emotion = 'excited';

    // 简单的场景分析
    let sceneType = 'casual_chat';
    if (/情感|心情|感受/.test(message)) sceneType = 'emotional_support';
    else if (/怎么办|建议|解决/.test(message)) sceneType = 'problem_solving';
    else if (/工作|学习|专业/.test(message)) sceneType = 'work_discussion';
    else if (/创意|想法|灵感/.test(message)) sceneType = 'creative_brainstorm';

    return {
      sceneType,
      emotion,
      topics: ['一般对话'],
      confidence: 0.6,
      participantSuggestions: emotion === 'negative' ? ['EMPATHY'] : ['EMPATHY', 'PRACTICAL'],
      reasoning: '使用规则回退分析（AI分析失败）',
      metadata: {
        analyzerId: analyzer.id,
        provider: analyzer.provider.name,
        model: analyzer.model.name,
        processingTime
      }
    };
  }

  /**
   * 执行场景分析
   */
  async analyzeScene(input: SceneAnalysisInput): Promise<SceneAnalysisResult> {
    const startTime = Date.now();

    try {
      // 获取活跃的分析器配置
      const analyzer = await this.getActiveAnalyzer();
      
      // 构建LLM配置和消息
      const llmConfig = this.buildLLMConfig(analyzer);
      const messages = this.buildAnalysisPrompt(input, analyzer);

      console.log(`🔍 [场景分析器] 开始分析场景...`);
      
      // 调用LLM进行分析
      const response = await llmService.chat(llmConfig, messages);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [场景分析器] 分析完成，耗时: ${processingTime}ms`);

      // 解析并返回结果
      return this.parseAnalysisResult(response.content, analyzer, processingTime);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [场景分析器] 分析失败:', error);

      // 返回错误回退结果
      return {
        sceneType: 'casual_chat',
        emotion: 'neutral',
        topics: ['一般对话'],
        confidence: 0.3,
        participantSuggestions: ['EMPATHY'],
        reasoning: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        metadata: {
          analyzerId: 'fallback',
          provider: 'fallback',
          model: 'rule-based',
          processingTime
        }
      };
    }
  }

  /**
   * 清除缓存（当配置更新时调用）
   */
  clearCache(): void {
    this.activeAnalyzer = null;
    this.lastLoadTime = 0;
    console.log('🔄 [场景分析器] 缓存已清除');
  }

  /**
   * 获取当前活跃分析器信息
   */
  async getCurrentAnalyzerInfo(): Promise<{ name: string; provider: string; model: string } | null> {
    try {
      const analyzer = await this.getActiveAnalyzer();
      return {
        name: analyzer.name,
        provider: analyzer.provider.name,
        model: analyzer.model.name
      };
    } catch (error) {
      return null;
    }
  }
}

// 导出单例实例
export const dynamicSceneAnalyzer = new DynamicSceneAnalyzer();
export default dynamicSceneAnalyzer;
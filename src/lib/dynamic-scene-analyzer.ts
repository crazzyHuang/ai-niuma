/**
 * 🔍 动态场景分析器
 * 
 * 从数据库中加载场景分析AI配置，支持灵活切换提供商和模型
 * 替代原有的硬编码场景分析实现
 */

import prisma from './db';
import llmService from './llm-service';
import { LLMConfig, LLMMessage } from '@/types/llm';
import { 
  SceneAnalysisResult, 
  SocialDynamics, 
  UserIntent, 
  ConversationFlow, 
  ContextualFactors,
  ParticipationSuggestion 
} from './agents/scene-analyzer-agent';

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

// 使用统一的 SceneAnalysisResult 接口
// export interface SceneAnalysisResult 已从 scene-analyzer-agent.ts 导入

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

    // 增强的系统提示词（如果分析器没有配置或需要更详细的输出）
    const enhancedSystemPrompt = `你是一个专业的对话场景分析AI。请深度分析用户消息和对话上下文，提供全面的场景理解。

请分析并返回以下JSON格式的完整结果：
{
  "sceneType": "emotional_support/problem_solving/casual_chat/work_discussion/creative_brainstorm/learning_discussion/debate_discussion/humor_entertainment/personal_sharing",
  "secondaryScene": "可选的次要场景类型",
  "emotion": "positive/negative/neutral/worried/excited/angry/sad/happy",
  "emotionalIntensity": 0.0-1.0,
  "topics": ["话题1", "话题2"],
  "confidence": 0.0-1.0,
  
  "socialDynamics": {
    "conversationTone": "formal/casual/friendly/tense/professional",
    "powerDynamics": "equal/user_leading/ai_leading",
    "intimacyLevel": "stranger/acquaintance/friend/close_friend",
    "groupCohesion": 0.0-1.0
  },
  
  "userIntent": {
    "primaryIntent": "seek_info/emotional_support/problem_solving/entertainment/casual_chat/learning/debate",
    "secondaryIntents": ["次要意图1", "次要意图2"],
    "urgencyLevel": 0.0-1.0,
    "expectationType": "quick_answer/deep_discussion/creative_collaboration/emotional_validation/natural_flow"
  },
  
  "conversationFlow": {
    "phase": "opening/development/climax/resolution/closing",
    "momentum": "building/stable/declining",
    "topicProgression": ["话题演进路径"],
    "interactionPattern": "question_answer/storytelling/brainstorming/debate/teaching"
  },
  
  "participantSuggestions": ["emotional_support", "humor_entertainment", "problem_solving", "creative_brainstorm", "personal_sharing"],
  "interactionStrategy": "supportive/challenging/collaborative/educational/entertaining",
  "reasoning": "分析的理由和依据"
}

请基于对话内容、情感状态、用户意图进行综合分析。`;

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
        content: analyzer.systemPrompt || enhancedSystemPrompt
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

      // 构建参与建议
      const participationPlan: ParticipationSuggestion[] = this.buildParticipationPlan(
        parsed.participantSuggestions || ['emotional_support'],
        parsed.sceneType || 'casual_chat'
      );

      // 返回完整的 SceneAnalysisResult
      return {
        // 基础场景信息
        sceneType: parsed.sceneType || 'casual_chat',
        secondaryScene: parsed.secondaryScene,
        emotion: parsed.emotion || 'neutral',
        emotionalIntensity: parsed.emotionalIntensity || 0.5,
        topics: Array.isArray(parsed.topics) ? parsed.topics : [parsed.topic || '一般对话'].filter(Boolean),
        confidence: parsed.confidence || 0.8,
        
        // V1需求：深度情境分析
        socialDynamics: parsed.socialDynamics || {
          conversationTone: parsed.conversationTone || 'casual',
          powerDynamics: parsed.powerDynamics || 'equal',
          intimacyLevel: parsed.intimacyLevel || 'acquaintance',
          groupCohesion: parsed.groupCohesion || 0.5
        },
        
        userIntent: parsed.userIntent || {
          primaryIntent: parsed.primaryIntent || 'casual_chat',
          secondaryIntents: parsed.secondaryIntents || [],
          urgencyLevel: parsed.urgencyLevel || 0.5,
          expectationType: parsed.expectationType || 'natural_flow'
        },
        
        conversationFlow: parsed.conversationFlow || {
          phase: parsed.phase || 'development',
          momentum: parsed.momentum || 'stable',
          topicProgression: parsed.topicProgression || [],
          interactionPattern: parsed.interactionPattern || 'question_answer'
        },
        
        contextualFactors: parsed.contextualFactors || {
          timeContext: {
            timeOfDay: 'afternoon',
            isWorkingHours: true,
            temporalRelevance: 'present'
          },
          environmentalContext: {
            setting: 'personal',
            formalityLevel: 'casual'
          },
          culturalContext: {
            language: 'zh-CN',
            communicationStyle: 'direct'
          }
        },
        
        // 智能建议
        participationPlan,
        interactionStrategy: parsed.interactionStrategy || 'supportive',
        
        // 元信息
        reasoning: parsed.reasoning || '基于消息内容进行的自动分析',
        analysisDepth: 'enhanced'
      };

    } catch (parseError) {
      console.warn('⚠️ [场景分析器] JSON解析失败，使用默认结果:', parseError);
      
      // 如果解析失败，返回基于规则的默认分析
      return this.getFallbackAnalysis(response, analyzer, processingTime);
    }
  }

  /**
   * 构建参与计划
   */
  private buildParticipationPlan(
    suggestions: string[], 
    sceneType: string
  ): ParticipationSuggestion[] {
    const plan: ParticipationSuggestion[] = [];
    
    suggestions.forEach((suggestion, index) => {
      const roleTag = this.mapSceneToRoleTag(suggestion);
      plan.push({
        agentName: roleTag, // 现在使用 roleTag 而不是场景建议
        priority: 1 - (index * 0.2), // 递减优先级
        roleInConversation: this.mapToRole(suggestion),
        expectedContribution: this.getExpectedContribution(suggestion, sceneType),
        estimatedEngagement: 0.7 - (index * 0.1)
      });
    });
    
    return plan;
  }

  /**
   * 将场景类型映射到对应的 roleTag
   */
  private mapSceneToRoleTag(sceneType: string): string {
    const sceneToRoleMap: Record<string, string> = {
      'emotional_support': 'EMPATHY',
      'personal_sharing': 'EMPATHY', 
      'problem_solving': 'PRACTICAL',
      'work_discussion': 'PRACTICAL',
      'creative_brainstorm': 'CREATIVE',
      'humor_entertainment': 'CREATIVE',
      'learning_discussion': 'ANALYST',
      'debate_discussion': 'ANALYST',
      'casual_chat': 'FOLLOWUP'
    };
    return sceneToRoleMap[sceneType] || 'EMPATHY';
  }

  /**
   * 映射建议到角色
   */
  private mapToRole(suggestion: string): string {
    const roleMap: Record<string, string> = {
      'emotional_support': 'primary_responder',
      'humor_entertainment': 'supporter',
      'personal_sharing': 'moderator',
      'problem_solving': 'primary_responder',
      'creative_brainstorm': 'creative_contributor'
    };
    return roleMap[suggestion] || 'supporter';
  }

  /**
   * 获取预期贡献
   */
  private getExpectedContribution(suggestion: string, sceneType: string): string {
    if (suggestion === 'emotional_support') return '提供情感支持和共情';
    if (suggestion === 'humor_entertainment') return '活跃气氛，缓解压力';
    if (suggestion === 'problem_solving') return '分析问题，提供解决方案';
    if (suggestion === 'creative_brainstorm') return '提供创意和新思路';
    return '提供支持和补充';
  }

  /**
   * 基于规则的回退分析
   */
  private getFallbackAnalysis(response: string, analyzer: any, processingTime: number): SceneAnalysisResult {
    const message = response.toLowerCase();
    
    // 简单的情感分析
    let emotion = 'neutral';
    let emotionalIntensity = 0.5;
    if (/开心|高兴|快乐|哈哈/.test(message)) {
      emotion = 'positive';
      emotionalIntensity = 0.7;
    } else if (/难过|伤心|沮丧|不开心/.test(message)) {
      emotion = 'negative';
      emotionalIntensity = 0.8;
    } else if (/担心|紧张|焦虑/.test(message)) {
      emotion = 'worried';
      emotionalIntensity = 0.7;
    } else if (/兴奋|激动/.test(message)) {
      emotion = 'excited';
      emotionalIntensity = 0.8;
    }

    // 简单的场景分析
    let sceneType = 'casual_chat';
    if (/情感|心情|感受|不开心|难过/.test(message)) sceneType = 'emotional_support';
    else if (/怎么办|建议|解决/.test(message)) sceneType = 'problem_solving';
    else if (/工作|学习|专业/.test(message)) sceneType = 'work_discussion';
    else if (/创意|想法|灵感/.test(message)) sceneType = 'creative_brainstorm';

    // 根据情感决定参与建议
    const participantSuggestions = emotion === 'negative' 
      ? ['emotional_support', 'personal_sharing']
      : ['emotional_support', 'humor_entertainment'];

    return {
      // 基础场景信息
      sceneType,
      secondaryScene: undefined,
      emotion,
      emotionalIntensity,
      topics: ['一般对话'],
      confidence: 0.6,
      
      // V1需求：深度情境分析（使用默认值）
      socialDynamics: {
        conversationTone: 'casual',
        powerDynamics: 'equal',
        intimacyLevel: 'acquaintance',
        groupCohesion: 0.5
      },
      
      userIntent: {
        primaryIntent: sceneType === 'emotional_support' ? 'seek_support' : 'casual_chat',
        secondaryIntents: [],
        urgencyLevel: emotion === 'negative' ? 0.7 : 0.5,
        expectationType: 'natural_flow'
      },
      
      conversationFlow: {
        phase: 'development',
        momentum: 'stable',
        topicProgression: [],
        interactionPattern: 'question_answer'
      },
      
      contextualFactors: {
        timeContext: {
          timeOfDay: 'afternoon',
          isWorkingHours: true,
          temporalRelevance: 'present'
        },
        environmentalContext: {
          setting: 'personal',
          formalityLevel: 'casual'
        },
        culturalContext: {
          language: 'zh-CN',
          communicationStyle: 'direct'
        }
      },
      
      // 智能建议
      participationPlan: this.buildParticipationPlan(participantSuggestions, sceneType),
      interactionStrategy: emotion === 'negative' ? 'supportive' : 'engaging',
      
      // 元信息
      reasoning: '使用规则回退分析（AI分析失败）',
      analysisDepth: 'basic'
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

      // 返回错误回退结果（完整结构）
      return {
        // 基础场景信息
        sceneType: 'casual_chat',
        secondaryScene: undefined,
        emotion: 'neutral',
        emotionalIntensity: 0.5,
        topics: ['一般对话'],
        confidence: 0.3,
        
        // V1需求：深度情境分析（使用默认值）
        socialDynamics: {
          conversationTone: 'casual',
          powerDynamics: 'equal',
          intimacyLevel: 'acquaintance',
          groupCohesion: 0.5
        },
        
        userIntent: {
          primaryIntent: 'casual_chat',
          secondaryIntents: [],
          urgencyLevel: 0.5,
          expectationType: 'natural_flow'
        },
        
        conversationFlow: {
          phase: 'development',
          momentum: 'stable',
          topicProgression: [],
          interactionPattern: 'question_answer'
        },
        
        contextualFactors: {
          timeContext: {
            timeOfDay: 'afternoon',
            isWorkingHours: true,
            temporalRelevance: 'present'
          },
          environmentalContext: {
            setting: 'personal',
            formalityLevel: 'casual'
          },
          culturalContext: {
            language: 'zh-CN',
            communicationStyle: 'direct'
          }
        },
        
        // 智能建议
        participationPlan: this.buildParticipationPlan(['emotional_support'], 'casual_chat'),
        interactionStrategy: 'supportive',
        
        // 元信息
        reasoning: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        analysisDepth: 'basic'
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
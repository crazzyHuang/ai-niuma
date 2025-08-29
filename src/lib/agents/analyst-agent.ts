/**
 * 📊 分析师Agent
 * 
 * 专门负责深度分析、数据解读、逻辑推理等场景
 * 提供客观理性的分析和洞察
 */

import { BaseAgent, AgentResult, ChatbotResponse } from '../intelligent-agent-bus';

export interface AnalystInput {
  request: {
    conversationId: string;
    userMessage: string;
    conversationHistory: any[];
  };
  analysisResult: any;
  analysisType?: 'data' | 'logic' | 'trend' | 'problem' | 'decision';
}

export class AnalystAgent extends BaseAgent {
  readonly id = 'analyst-agent';
  readonly capabilities = ['data_analysis', 'logical_reasoning', 'trend_analysis', 'decision_support'];

  async execute(input: AnalystInput): Promise<AgentResult> {
    this.lastExecution = new Date();
    
    try {
      if (!this.validateInput(input, ['request'])) {
        return this.formatOutput(null, false);
      }

      console.log(`📊 [分析师Agent] 开始深度分析...`);

      const analysisType = input.analysisType || this.detectAnalysisType(input.request.userMessage);
      const analysisPrompt = this.buildAnalysisPrompt(input, analysisType);
      
      const response = await this.callLLM(analysisPrompt);
      
      const result: ChatbotResponse = {
        agentName: '数据分析师',
        content: response,
        timestamp: new Date(),
        confidence: 0.9
      };

      console.log(`🔍 [分析师Agent] 分析完成: ${analysisType}`);
      
      return this.formatOutput(result, true);

    } catch (error) {
      console.error('❌ [分析师Agent] 执行失败:', error);
      return this.formatOutput(null, false);
    }
  }

  /**
   * 检测分析类型
   */
  private detectAnalysisType(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('数据') || message.includes('统计') || message.includes('比较')) {
      return 'data';
    }
    if (message.includes('为什么') || message.includes('原因') || message.includes('逻辑')) {
      return 'logic';
    }
    if (message.includes('趋势') || message.includes('发展') || message.includes('未来')) {
      return 'trend';
    }
    if (message.includes('问题') || message.includes('困难') || message.includes('挑战')) {
      return 'problem';
    }
    if (message.includes('选择') || message.includes('决定') || message.includes('应该')) {
      return 'decision';
    }
    
    return 'logic';
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(input: AnalystInput, analysisType: string): string {
    const userMessage = input.request.userMessage;
    const topics = input.analysisResult?.topics || [];
    
    const analysisFrameworks = {
      data: '运用数据思维，从数量、质量、趋势等角度进行客观分析。',
      logic: '运用逻辑推理，分析因果关系、前提条件和推论过程。',
      trend: '基于现有信息，分析发展趋势和可能的未来走向。',
      problem: '系统性地拆解问题，识别根本原因和关键影响因素。',
      decision: '权衡利弊，分析各种选择的风险和机会。'
    };

    const analysisSteps = {
      data: '1) 识别关键数据点 → 2) 分析数据关联 → 3) 得出客观结论',
      logic: '1) 明确前提假设 → 2) 分析推理链条 → 3) 验证逻辑有效性',
      trend: '1) 分析现状特征 → 2) 识别变化因子 → 3) 预测发展方向',
      problem: '1) 问题具体化定义 → 2) 根因深度挖掘 → 3) 影响因素排序',
      decision: '1) 列出备选方案 → 2) 分析利弊得失 → 3) 给出推荐理由'
    };

    return `你是一位资深的数据分析师，擅长${analysisType === 'data' ? '数据分析' : analysisType === 'logic' ? '逻辑推理' : analysisType === 'trend' ? '趋势分析' : analysisType === 'problem' ? '问题分析' : '决策分析'}。

用户消息：${userMessage}
相关话题：${topics.join('、')}

分析方法：${analysisFrameworks[analysisType]}
分析步骤：${analysisSteps[analysisType]}

请以专业分析师的身份，用理性客观的语言进行分析（150-250字）。要：
1. 提供结构化的分析框架
2. 基于逻辑和事实进行推理
3. 给出具体可行的洞察
4. 保持客观中性的专业态度
5. 用数据和逻辑支撑观点`;
  }
}

export default AnalystAgent;
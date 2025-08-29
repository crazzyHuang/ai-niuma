/**
 * 🎯 质量评估Agent
 * 
 * 专门负责评估其他Agent回复的质量
 * 提供改进建议和质量分数
 */

import { BaseAgent, AgentResult, ChatbotResponse } from '../intelligent-agent-bus';

export interface QualityAssessmentInput {
  originalMessage: string;
  agentResponses: ChatbotResponse[];
  sceneAnalysis: any;
  expectedOutcome?: string;
}

export interface QualityAssessmentResult {
  overallScore: number;
  individualScores: { [agentName: string]: number };
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  coherenceScore: number;
  relevanceScore: number;
  helpfulnessScore: number;
}

export class QualityAssessorAgent extends BaseAgent {
  readonly id = 'quality-assessor';
  readonly capabilities = ['quality_assessment', 'response_evaluation', 'improvement_suggestion'];

  async execute(input: QualityAssessmentInput): Promise<AgentResult> {
    this.lastExecution = new Date();
    
    try {
      if (!this.validateInput(input, ['originalMessage', 'agentResponses'])) {
        return this.formatOutput(null, false);
      }

      console.log(`🎯 [质量评估Agent] 开始评估${input.agentResponses.length}个回复...`);

      // 构建评估提示词
      const assessmentPrompt = this.buildAssessmentPrompt(input);
      const response = await this.callLLM(assessmentPrompt);
      
      // 解析评估结果
      const assessmentResult = this.parseAssessmentResult(response, input);
      
      console.log(`✅ [质量评估Agent] 评估完成，总分: ${assessmentResult.overallScore}`);
      
      return this.formatOutput(assessmentResult, true);

    } catch (error) {
      console.error('❌ [质量评估Agent] 执行失败:', error);
      return this.formatOutput(this.getDefaultAssessment(input), false);
    }
  }

  /**
   * 构建评估提示词
   */
  private buildAssessmentPrompt(input: QualityAssessmentInput): string {
    const responsesText = input.agentResponses.map(
      (r, i) => `[回复${i + 1}] ${r.agentName}: ${r.content}`
    ).join('\n\n');

    const sceneType = input.sceneAnalysis?.sceneType || 'general';
    const emotion = input.sceneAnalysis?.emotion || 'neutral';

    return `你是一位专业的对话质量评估师，请对以下AI群聊回复进行全面评估。

【原始用户消息】
${input.originalMessage}

【场景信息】
- 场景类型: ${sceneType}
- 用户情感: ${emotion}

【AI回复内容】
${responsesText}

请从以下维度进行评估（每项0-1分）：

1. **相关性(Relevance)**: 回复是否切题，是否回应了用户的核心需求
2. **连贯性(Coherence)**: 多个AI之间的回复是否连贯，是否形成了良好的对话流
3. **有用性(Helpfulness)**: 回复是否对用户有实际帮助，是否提供了价值
4. **情感匹配(Emotional Fit)**: 回复是否与用户的情感状态匹配
5. **多样性(Diversity)**: 不同AI是否提供了不同角度的见解
6. **自然性(Naturalness)**: 回复是否自然，不显得机械化

请严格按照以下JSON格式返回评估结果：

{
  "overallScore": 0.85,
  "individualScores": {
    "Agent名称1": 0.8,
    "Agent名称2": 0.9
  },
  "relevanceScore": 0.9,
  "coherenceScore": 0.8,
  "helpfulnessScore": 0.85,
  "emotionalFitScore": 0.9,
  "diversityScore": 0.7,
  "naturalnessScore": 0.85,
  "strengths": ["优点1", "优点2", "优点3"],
  "improvements": ["改进点1", "改进点2"],
  "recommendations": ["建议1", "建议2"]
}`;
  }

  /**
   * 解析评估结果
   */
  private parseAssessmentResult(llmResponse: string, input: QualityAssessmentInput): QualityAssessmentResult {
    try {
      // 尝试解析JSON
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          overallScore: this.validateScore(parsed.overallScore),
          individualScores: parsed.individualScores || {},
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['回复内容丰富'],
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          coherenceScore: this.validateScore(parsed.coherenceScore),
          relevanceScore: this.validateScore(parsed.relevanceScore),
          helpfulnessScore: this.validateScore(parsed.helpfulnessScore)
        };
      }
    } catch (error) {
      console.warn('⚠️ [质量评估Agent] JSON解析失败，使用启发式评估');
    }

    // 启发式评估作为后备
    return this.heuristicAssessment(input);
  }

  /**
   * 启发式质量评估
   */
  private heuristicAssessment(input: QualityAssessmentInput): QualityAssessmentResult {
    const responses = input.agentResponses;
    const userMessage = input.originalMessage.toLowerCase();
    
    let totalScore = 0;
    const individualScores: { [key: string]: number } = {};
    
    for (const response of responses) {
      let score = 0.5; // 基础分数
      
      // 长度合理性
      if (response.content.length >= 50 && response.content.length <= 300) {
        score += 0.2;
      }
      
      // 情感匹配检测
      if (this.checkEmotionalMatch(response.content, input.sceneAnalysis?.emotion)) {
        score += 0.15;
      }
      
      // 相关性检测
      if (this.checkRelevance(response.content, userMessage)) {
        score += 0.15;
      }
      
      individualScores[response.agentName] = Math.min(score, 1.0);
      totalScore += score;
    }
    
    const averageScore = responses.length > 0 ? totalScore / responses.length : 0.5;
    
    return {
      overallScore: Math.min(averageScore, 1.0),
      individualScores,
      strengths: ['回复及时', '内容相关'],
      improvements: responses.length < 2 ? ['可增加更多AI参与'] : [],
      recommendations: ['保持当前质量水平'],
      coherenceScore: responses.length > 1 ? 0.8 : 0.6,
      relevanceScore: 0.8,
      helpfulnessScore: 0.75
    };
  }

  /**
   * 检查情感匹配
   */
  private checkEmotionalMatch(content: string, emotion?: string): boolean {
    if (!emotion) return true;
    
    const contentLower = content.toLowerCase();
    
    switch (emotion) {
      case 'negative':
      case 'worried':
        return /[理解|支持|帮助|陪伴|没关系|会好的|一起]/.test(contentLower);
      case 'positive':
      case 'excited':
        return /[太好了|真棒|厉害|开心|哈哈|👍|🎉]/.test(content) || 
               /[不错|很好|棒|赞]/.test(contentLower);
      default:
        return true;
    }
  }

  /**
   * 检查相关性
   */
  private checkRelevance(content: string, userMessage: string): boolean {
    const contentWords = content.toLowerCase().split(/\s+/);
    const userWords = userMessage.split(/\s+/);
    
    // 简单的词汇重叠检测
    const overlap = contentWords.filter(word => 
      userWords.some(userWord => userWord.includes(word) || word.includes(userWord))
    ).length;
    
    return overlap > 0;
  }

  /**
   * 验证分数范围
   */
  private validateScore(score: any): number {
    const num = parseFloat(score);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  }

  /**
   * 获取默认评估结果
   */
  private getDefaultAssessment(input: QualityAssessmentInput): QualityAssessmentResult {
    return {
      overallScore: 0.6,
      individualScores: {},
      strengths: ['基本功能正常'],
      improvements: ['需要改进评估系统'],
      recommendations: ['继续优化回复质量'],
      coherenceScore: 0.6,
      relevanceScore: 0.6,
      helpfulnessScore: 0.6
    };
  }
}

export default QualityAssessorAgent;
import { NextRequest, NextResponse } from 'next/server';
import LLMConfigManager from '@/lib/llm-config';
import llmService from '@/lib/llm-service';
import { LLMProvider } from '@/types/llm';

export async function GET(request: NextRequest) {
  try {
    // 获取所有可用提供商
    const providers = LLMConfigManager.getAvailableProviders();
    
    const configStatus = await Promise.all(
      providers.map(async (provider) => {
        try {
          // 检查是否有API密钥
          const config = LLMConfigManager.buildLLMConfig(
            provider.id,
            provider.models[0]?.id || 'default'
          );
          
          // 验证配置
          const isValid = llmService.validateConfig(config);
          
          if (!isValid) {
            return {
              provider: provider.id,
              name: provider.name,
              status: 'missing' as const,
              models: [],
              error: `API密钥未配置或无效`,
            };
          }

          // 尝试获取可用模型（仅对已配置的提供商）
          let availableModels: string[] = [];
          try {
            // 注意：某些提供商可能需要不同的模型获取方式
            if (provider.id === 'openai' || provider.id === 'deepseek') {
              availableModels = await llmService.getAvailableModels(provider.id, config.apiKey);
            } else {
              // 对于其他提供商，使用配置文件中的模型列表
              availableModels = provider.models.map(m => m.id);
            }
          } catch (modelError) {
            // 如果获取模型失败，使用配置文件中的默认模型
            availableModels = provider.models.map(m => m.id);
          }

          return {
            provider: provider.id,
            name: provider.name,
            status: 'configured' as const,
            models: availableModels,
          };

        } catch (error) {
          return {
            provider: provider.id,
            name: provider.name,
            status: 'error' as const,
            models: [],
            error: error instanceof Error ? error.message : '配置检查失败',
          };
        }
      })
    );

    // 检查系统整体配置
    const systemValidation = LLMConfigManager.validateConfiguration();

    return NextResponse.json({
      providers: configStatus,
      systemStatus: {
        isValid: systemValidation.isValid,
        errors: systemValidation.errors,
      },
      summary: {
        total: configStatus.length,
        configured: configStatus.filter(p => p.status === 'configured').length,
        missing: configStatus.filter(p => p.status === 'missing').length,
        errors: configStatus.filter(p => p.status === 'error').length,
      },
    });

  } catch (error) {
    console.error('Config status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check configuration status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

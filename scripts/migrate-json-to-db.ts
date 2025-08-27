import { PrismaClient } from '@prisma/client';
import singleProviderConfig from '../config/single-provider-agents.json';

const prisma = new PrismaClient();

/**
 * 将JSON配置迁移到数据库
 * 运行命令：npx tsx scripts/migrate-json-to-db.ts
 */
async function migrateJsonToDatabase() {
  try {
    console.log('🚀 开始迁移JSON配置到数据库...');

    // 创建默认管理员用户（如果不存在）
    const defaultAdmin = await prisma.user.upsert({
      where: { email: 'admin@ai-niuma.com' },
      update: {},
      create: {
        email: 'admin@ai-niuma.com',
        name: 'System Admin',
        role: 'admin',
        plan: 'pro'
      }
    });
    console.log('✅ 管理员用户创建/更新成功:', defaultAdmin.id);

    // 1. 创建LLM提供商
    const provider = await prisma.lLMProvider.upsert({
      where: { code: singleProviderConfig.provider },
      update: {
        name: getProviderName(singleProviderConfig.provider),
        baseUrl: getProviderBaseUrl(singleProviderConfig.provider),
        apiKey: process.env.MODELSCOPE_API_KEY || 'your-api-key-here',
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        name: getProviderName(singleProviderConfig.provider),
        code: singleProviderConfig.provider,
        baseUrl: getProviderBaseUrl(singleProviderConfig.provider),
        apiKey: process.env.MODELSCOPE_API_KEY || 'your-api-key-here',
        isActive: true,
        createdBy: defaultAdmin.id
      }
    });
    console.log('✅ LLM提供商创建成功:', provider.name);

    // 2. 创建LLM模型
    const model = await prisma.lLMModel.upsert({
      where: {
        providerId_code: {
          providerId: provider.id,
          code: singleProviderConfig.model
        }
      },
      update: {
        name: getModelName(singleProviderConfig.model),
        description: getModelDescription(singleProviderConfig.model),
        contextLength: getModelContextLength(singleProviderConfig.model),
        capabilities: getModelCapabilities(singleProviderConfig.model),
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        name: getModelName(singleProviderConfig.model),
        code: singleProviderConfig.model,
        providerId: provider.id,
        description: getModelDescription(singleProviderConfig.model),
        contextLength: getModelContextLength(singleProviderConfig.model),
        capabilities: getModelCapabilities(singleProviderConfig.model),
        pricing: {
          input: 0.5,
          output: 1.5
        },
        isActive: true
      }
    });
    console.log('✅ LLM模型创建成功:', model.name);

    // 3. 创建智能体
    console.log('📝 开始创建智能体...');
    const agents = [];
    
    for (const agentConfig of singleProviderConfig.agents) {
      const agent = await prisma.agent.upsert({
        where: { roleTag: agentConfig.roleTag },
        update: {
          name: agentConfig.name,
          prompt: agentConfig.systemPrompt,
          description: getAgentDescription(agentConfig.roleTag),
          color: getAgentColor(agentConfig.roleTag),
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
          modelId: model.id,
          enabled: true,
          updatedAt: new Date()
        },
        create: {
          name: agentConfig.name,
          provider: singleProviderConfig.provider,
          roleTag: agentConfig.roleTag,
          order: agentConfig.order,
          prompt: agentConfig.systemPrompt,
          description: getAgentDescription(agentConfig.roleTag),
          color: getAgentColor(agentConfig.roleTag),
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
          modelId: model.id,
          enabled: true,
          createdBy: defaultAdmin.id
        }
      });
      agents.push(agent);
      console.log('  ✅', agent.name, `(${agent.roleTag})`);
    }

    // 4. 创建流程
    console.log('🔄 开始创建流程...');
    for (const flowConfig of singleProviderConfig.flows) {
      const flow = await prisma.flow.upsert({
        where: { mode: flowConfig.mode },
        update: {
          name: flowConfig.name,
          steps: flowConfig.steps.map(roleTag => ({ roleTag })),
          randomOrder: flowConfig.randomOrder || false,
          dynamic: flowConfig.dynamic || false,
          enabled: true,
          updatedAt: new Date()
        },
        create: {
          name: flowConfig.name,
          mode: flowConfig.mode,
          steps: flowConfig.steps.map(roleTag => ({ roleTag })),
          description: `自动迁移的流程：${flowConfig.name}`,
          randomOrder: flowConfig.randomOrder || false,
          dynamic: flowConfig.dynamic || false,
          enabled: true,
          createdBy: defaultAdmin.id
        }
      });
      console.log('  ✅', flow.name, `(${flow.mode})`);
    }

    console.log('\n🎉 数据迁移完成！');
    console.log('📊 迁移统计:');
    console.log(`  - LLM提供商: 1个 (${provider.name})`);
    console.log(`  - LLM模型: 1个 (${model.name})`);
    console.log(`  - 智能体: ${agents.length}个`);
    console.log(`  - 流程: ${singleProviderConfig.flows.length}个`);

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 辅助函数
function getProviderName(code: string): string {
  const names: Record<string, string> = {
    'openai': 'OpenAI',
    'deepseek': 'DeepSeek',
    'modelscope': 'ModelScope',
    'doubao': 'Doubao',
    'xai': 'xAI',
    'google': 'Google'
  };
  return names[code] || code;
}

function getProviderBaseUrl(code: string): string {
  const urls: Record<string, string> = {
    'openai': 'https://api.openai.com/v1',
    'deepseek': 'https://api.deepseek.com',
    'modelscope': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'doubao': 'https://ark.cn-beijing.volces.com/api/v3',
    'xai': 'https://api.x.ai/v1',
    'google': 'https://generativelanguage.googleapis.com/v1'
  };
  return urls[code] || `https://api.${code}.com/v1`;
}

function getModelName(code: string): string {
  if (code.includes('DeepSeek-V3.1')) return 'DeepSeek-V3.1';
  if (code.includes('DeepSeek')) return 'DeepSeek';
  return code;
}

function getModelDescription(code: string): string {
  if (code.includes('DeepSeek-V3.1')) return 'DeepSeek最新旗舰大语言模型，具备强大的推理和对话能力';
  return `${code} 大语言模型`;
}

function getModelContextLength(code: string): number {
  if (code.includes('DeepSeek')) return 64000;
  return 32000;
}

function getModelCapabilities(code: string): string[] {
  const baseCapabilities = ['chat', 'reasoning'];
  if (code.includes('DeepSeek')) {
    return [...baseCapabilities, 'coding', 'analysis'];
  }
  return baseCapabilities;
}

function getAgentDescription(roleTag: string): string {
  const descriptions: Record<string, string> = {
    'EMPATHY': '提供情感支持和共鸣的温暖朋友',
    'PRACTICAL': '给出实用建议的解决问题专家',
    'FOLLOWUP': '提供后续关怀和温暖陪伴',
    'CREATIVE': '提供创意思路和新颖视角',
    'ANALYST': '进行理性分析和逻辑思考'
  };
  return descriptions[roleTag] || `${roleTag} 智能体`;
}

function getAgentColor(roleTag: string): string {
  const colors: Record<string, string> = {
    'EMPATHY': '#EF4444',    // 红色 - 温暖
    'PRACTICAL': '#3B82F6',  // 蓝色 - 理性
    'FOLLOWUP': '#10B981',   // 绿色 - 关怀
    'CREATIVE': '#F59E0B',   // 橙色 - 创意
    'ANALYST': '#8B5CF6'     // 紫色 - 分析
  };
  return colors[roleTag] || '#6B7280';
}

// 运行迁移
if (require.main === module) {
  migrateJsonToDatabase()
    .then(() => {
      console.log('✨ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export default migrateJsonToDatabase;
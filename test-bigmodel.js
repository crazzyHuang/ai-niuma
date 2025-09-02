// 测试 BigModel 集成
import { llmService } from './src/lib/llm-service.ts';

async function testBigModel() {
  console.log('🧪 开始测试 BigModel 集成...\n');
  
  // 测试配置
  const config = {
    provider: 'bigmodel',
    apiKey: process.env.BIGMODEL_API_KEY || 'your-api-key-here',
    model: 'glm-4',
    temperature: 0.7,
    maxTokens: 1000
  };
  
  // 测试消息
  const messages = [
    {
      role: 'system',
      content: '你是一个友好的AI助手。'
    },
    {
      role: 'user',
      content: '请用一句话介绍一下自己。'
    }
  ];
  
  try {
    // 1. 测试配置验证
    console.log('1️⃣ 测试配置验证...');
    const isValid = llmService.validateConfig(config);
    console.log(`   配置验证结果: ${isValid ? '✅ 通过' : '❌ 失败'}\n`);
    
    // 2. 测试获取可用模型
    console.log('2️⃣ 获取可用模型列表...');
    const models = await llmService.getAvailableModels('bigmodel', config.apiKey);
    console.log('   可用模型:', models.join(', '), '\n');
    
    // 3. 测试支持的提供商
    console.log('3️⃣ 检查支持的提供商...');
    const providers = llmService.getSupportedProviders();
    const hasBigModel = providers.includes('bigmodel');
    console.log(`   BigModel 支持状态: ${hasBigModel ? '✅ 已支持' : '❌ 未支持'}`);
    console.log('   所有支持的提供商:', providers.join(', '), '\n');
    
    // 4. 测试非流式聊天
    if (config.apiKey !== 'your-api-key-here') {
      console.log('4️⃣ 测试非流式聊天...');
      const response = await llmService.chat(config, messages);
      console.log('   响应内容:', response.content);
      console.log('   使用的模型:', response.model);
      console.log('   Token 使用情况:', response.usage, '\n');
      
      // 5. 测试流式聊天
      console.log('5️⃣ 测试流式聊天...');
      let streamContent = '';
      await llmService.streamChat(
        config,
        messages,
        (chunk) => {
          streamContent += chunk.content;
          process.stdout.write(chunk.content);
        }
      );
      console.log('\n   流式响应完成\n');
    } else {
      console.log('⚠️  请设置 BIGMODEL_API_KEY 环境变量以测试实际API调用\n');
    }
    
    console.log('✨ BigModel 集成测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testBigModel();
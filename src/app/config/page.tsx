'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Workflow, ToggleLeft, ToggleRight } from 'lucide-react';
import { APIClient, APIResponseHelper } from '@/types/api';

interface ConfigInfo {
  isSingleProvider: boolean;
  currentProvider: {
    provider: string;
    model: string;
  };
  agents: Array<{
    roleTag: string;
    name: string;
    order: number;
  }>;
  flows: Array<{
    name: string;
    mode: string;
    steps: string[];
  }>;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await APIClient.get('/api/config/current');
      if (APIResponseHelper.isSuccess(result)) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = async () => {
    try {
      const result = await APIClient.post('/api/config/toggle-mode');
      if (APIResponseHelper.isSuccess(result)) {
        loadConfig(); // 重新加载配置
      }
    } catch (error) {
      console.error('Failed to toggle mode:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载配置中...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">加载配置失败</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="w-8 h-8 mr-3 text-blue-600" />
                系统配置
              </h1>
              <p className="text-gray-600 mt-2">
                当前运行模式和Agent配置状态
              </p>
            </div>
            <Button onClick={loadConfig}>
              刷新配置
            </Button>
          </div>
        </div>

        {/* 运行模式 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                {config.isSingleProvider ? (
                  <ToggleRight className="w-6 h-6 mr-2 text-green-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 mr-2 text-blue-600" />
                )}
                运行模式
              </span>
              <Button variant="outline" size="sm" onClick={toggleMode}>
                切换模式
              </Button>
            </CardTitle>
            <CardDescription>
              {config.isSingleProvider 
                ? '当前使用单一厂家模式 - 适合开发测试'
                : '当前使用多厂家模式 - 生产环境模式'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">当前厂家</h4>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {config.currentProvider.provider}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">使用模型</h4>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {config.currentProvider.model}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Agents配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-6 h-6 mr-2 text-purple-600" />
                智能体配置
              </CardTitle>
              <CardDescription>
                当前可用的AI智能体 ({config.agents.length}个)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.agents
                  .sort((a, b) => a.order - b.order)
                  .map((agent) => (
                  <div key={agent.roleTag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-600">#{agent.order} - {agent.roleTag}</div>
                    </div>
                    <Badge variant="outline">{agent.roleTag}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Flows配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Workflow className="w-6 h-6 mr-2 text-green-600" />
                对话流程
              </CardTitle>
              <CardDescription>
                可用的对话流程 ({config.flows.length}个)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.flows.map((flow) => (
                  <div key={flow.mode} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{flow.name}</div>
                      <Badge variant="outline">{flow.mode}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {flow.steps.map((step, index) => (
                        <span key={step} className="text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {index + 1}. {step}
                          </Badge>
                          {index < flow.steps.length - 1 && (
                            <span className="mx-1 text-gray-400">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 配置说明 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>配置说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">
                  🟢 单一厂家模式（当前{config.isSingleProvider ? '启用' : '未启用'}）
                </h4>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• 使用一个LLM厂家，多个不同角色的Agent</li>
                  <li>• 通过不同的提示词实现不同功能</li>
                  <li>• 配置简单，适合开发测试</li>
                  <li>• 成本可控，便于调试</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  🔵 多厂家模式（当前{!config.isSingleProvider ? '启用' : '未启用'}）
                </h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• 不同Agent使用不同厂家的模型</li>
                  <li>• 发挥各厂家模型的专长</li>
                  <li>• 配置复杂，适合生产环境</li>
                  <li>• 需要多个API密钥</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

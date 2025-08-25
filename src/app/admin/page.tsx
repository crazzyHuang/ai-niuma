'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Settings, AlertTriangle } from 'lucide-react';

interface ConfigStatus {
  provider: string;
  name: string;
  status: 'configured' | 'missing' | 'error';
  models: string[];
  error?: string;
}

export default function AdminPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/config-status');
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to check configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'bg-green-100 text-green-800';
      case 'missing':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查配置状态中...</p>
        </div>
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
                系统管理
              </h1>
              <p className="text-gray-600 mt-2">
                管理和监控 AI 朋友圈系统的配置状态
              </p>
            </div>
            <Button onClick={checkConfiguration} disabled={isLoading}>
              刷新状态
            </Button>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {configStatus.map((config) => (
            <Card key={config.provider}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{config.name}</CardTitle>
                  {getStatusIcon(config.status)}
                </div>
                <CardDescription>
                  提供商: {config.provider}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Badge className={getStatusColor(config.status)}>
                      {config.status === 'configured' ? '已配置' :
                       config.status === 'missing' ? '未配置' : '配置错误'}
                    </Badge>
                  </div>
                  
                  {config.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {config.error}
                    </div>
                  )}
                  
                  {config.models.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        可用模型 ({config.models.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {config.models.slice(0, 3).map((model) => (
                          <Badge key={model} variant="outline" className="text-xs">
                            {model}
                          </Badge>
                        ))}
                        {config.models.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{config.models.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Configuration Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>配置说明</CardTitle>
            <CardDescription>
              如何配置各个AI服务提供商的API密钥
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">环境变量配置</h4>
                <p className="text-blue-800 text-sm mb-3">
                  在项目根目录创建 <code>.env.local</code> 文件，添加以下配置：
                </p>
                <pre className="bg-blue-900 text-blue-100 p-3 rounded text-xs overflow-x-auto">
{`# OpenAI
OPENAI_API_KEY=sk-...

# DeepSeek  
DEEPSEEK_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GOOGLE_API_KEY=AIza...

# 豆包 (字节跳动)
DOUBAO_API_KEY=...

# xAI
XAI_API_KEY=xai-...`}
                </pre>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">注意事项</h4>
                <ul className="text-amber-800 text-sm space-y-1">
                  <li>• 配置环境变量后需要重启开发服务器</li>
                  <li>• 确保API密钥有足够的调用额度</li>
                  <li>• 不要将API密钥提交到版本控制系统</li>
                  <li>• 生产环境请在部署平台设置环境变量</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

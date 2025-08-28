'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Network, Plus, Edit, Trash2, Key, TestTube, Save, Eye, EyeOff, ChevronDown, ChevronRight, Bot, AlertCircle, Loader2, Download } from 'lucide-react';
import Link from 'next/link';

interface LLMModel {
  id: string;
  name: string;
  code: string;
  contextLength: number;
  maxTokens: number;
  capabilities: string[];
  isActive: boolean;
  agentCount: number;
}

interface LLMProvider {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
  isActive: boolean;
  models: LLMModel[];
  agentCount: number;
}

const providerTemplates = [
  {
    name: 'DeepSeek',
    code: 'deepseek',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    description: '性价比高的中文模型'
  },
  {
    name: 'OpenAI',
    code: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    description: '功能强大的多语言模型'
  },
  {
    name: 'Anthropic Claude',
    code: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    description: '注重安全的对话模型'
  },
  {
    name: 'Google Gemini',
    code: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    description: 'Google的最新生成模型'
  }
];

const capabilityOptions = [
  { value: 'chat', label: '文本对话' },
  { value: 'vision', label: '图像识别' },
  { value: 'function-calling', label: '函数调用' },
  { value: 'code', label: '代码生成' },
  { value: 'reasoning', label: '推理分析' }
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [providerFormData, setProviderFormData] = useState({
    name: '',
    code: '',
    baseUrl: '',
    apiKey: '',
    isActive: true
  });

  const [modelFormData, setModelFormData] = useState({
    name: '',
    code: '',
    contextLength: 4000,
    maxTokens: 1000,
    capabilities: ['chat'],
    isActive: true
  });

  // 加载数据
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/providers');
      const result = await response.json();
      
      if (result.success) {
        setProviders(result.data);
      } else {
        console.error('加载提供商失败:', result.error);
      }
    } catch (error) {
      console.error('加载提供商失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProvider = async () => {
    if (!validateProviderForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerFormData)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadProviders();
        setIsCreateDialogOpen(false);
        resetProviderForm();
      } else {
        console.error('创建提供商失败:', result.error);
        alert(`创建失败: ${result.error}`);
      }
    } catch (error) {
      console.error('创建提供商失败:', error);
      alert('创建提供商失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateModel = async () => {
    if (!selectedProvider || !validateModelForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...modelFormData,
          providerId: selectedProvider.id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadProviders();
        setIsCreateModelDialogOpen(false);
        resetModelForm();
      } else {
        console.error('创建模型失败:', result.error);
        alert(`创建失败: ${result.error}`);
      }
    } catch (error) {
      console.error('创建模型失败:', error);
      alert('创建模型失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportPresetModels = async (providerId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadProviders();
        alert(`成功导入 ${result.data.length} 个预设模型`);
      } else {
        console.error('导入模型失败:', result.error);
        alert(`导入失败: ${result.error}`);
      }
    } catch (error) {
      console.error('导入模型失败:', error);
      alert('导入模型失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateProviderForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!providerFormData.name.trim()) {
      newErrors.name = '提供商名称不能为空';
    }
    if (!providerFormData.code.trim()) {
      newErrors.code = '代码标识不能为空';
    }
    if (!providerFormData.baseUrl.trim()) {
      newErrors.baseUrl = 'API基础URL不能为空';
    }
    if (!providerFormData.apiKey.trim()) {
      newErrors.apiKey = 'API密钥不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateModelForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!modelFormData.name.trim()) {
      newErrors.name = '模型名称不能为空';
    }
    if (!modelFormData.code.trim()) {
      newErrors.code = '模型代码不能为空';
    }
    if (modelFormData.contextLength < 1000) {
      newErrors.contextLength = '上下文长度不能小于1000';
    }
    if (modelFormData.maxTokens < 100) {
      newErrors.maxTokens = '最大Token数不能小于100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetProviderForm = () => {
    setProviderFormData({
      name: '',
      code: '',
      baseUrl: '',
      apiKey: '',
      isActive: true
    });
    setErrors({});
  };

  const resetModelForm = () => {
    setModelFormData({
      name: '',
      code: '',
      contextLength: 4000,
      maxTokens: 1000,
      capabilities: ['chat'],
      isActive: true
    });
    setErrors({});
  };

  const applyTemplate = (template: typeof providerTemplates[0]) => {
    setProviderFormData({
      name: template.name,
      code: template.code,
      baseUrl: template.baseUrl,
      apiKey: '',
      isActive: true
    });
  };

  const toggleProvider = (providerId: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const toggleCapability = (capability: string) => {
    setModelFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(capability)
        ? prev.capabilities.filter(c => c !== capability)
        : [...prev.capabilities, capability]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LLM提供商管理</h1>
          <p className="mt-2 text-gray-600">配置AI模型提供商和管理模型列表</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              新增提供商
            </Button>
          </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>添加LLM提供商</DialogTitle>
                  <DialogDescription>
                    配置新的AI模型提供商
                  </DialogDescription>
                </DialogHeader>

                {/* 快速模板选择 */}
                <div className="mb-6">
                  <Label className="text-sm font-medium">快速选择模板</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {providerTemplates.map((template) => (
                      <Button
                        key={template.code}
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                        className="justify-start"
                      >
                        <Network className="h-4 w-4 mr-2" />
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">提供商名称</Label>
                      <Input
                        id="name"
                        value={providerFormData.name}
                        onChange={(e) => setProviderFormData({...providerFormData, name: e.target.value})}
                        placeholder="例如：DeepSeek"
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">代码标识</Label>
                      <Input
                        id="code"
                        value={providerFormData.code}
                        onChange={(e) => setProviderFormData({...providerFormData, code: e.target.value})}
                        placeholder="例如：deepseek"
                        className={errors.code ? 'border-red-500' : ''}
                      />
                      {errors.code && (
                        <p className="text-xs text-red-500">{errors.code}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">API基础URL</Label>
                    <Input
                      id="baseUrl"
                      value={providerFormData.baseUrl}
                      onChange={(e) => setProviderFormData({...providerFormData, baseUrl: e.target.value})}
                      placeholder="https://api.example.com/v1"
                      className={errors.baseUrl ? 'border-red-500' : ''}
                    />
                    {errors.baseUrl && (
                      <p className="text-xs text-red-500">{errors.baseUrl}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API密钥</Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        value={providerFormData.apiKey}
                        onChange={(e) => setProviderFormData({...providerFormData, apiKey: e.target.value})}
                        placeholder="请输入API密钥"
                        className={`pr-10 ${errors.apiKey ? 'border-red-500' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {errors.apiKey && (
                      <p className="text-xs text-red-500">{errors.apiKey}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={providerFormData.isActive}
                      onCheckedChange={(checked) => setProviderFormData({...providerFormData, isActive: checked})}
                    />
                    <Label htmlFor="isActive">启用提供商</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateProvider} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        添加提供商
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
      </div>

      {/* Providers List */}
      <Card>
          <CardHeader>
            <CardTitle>提供商列表</CardTitle>
            <CardDescription>
              管理系统中的AI模型提供商和对应的模型列表，共 {providers.length} 个提供商
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">加载提供商中...</p>
                </div>
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无提供商，点击"新增提供商"开始创建
              </div>
            ) : (
              <div className="space-y-4">
                {providers.map((provider) => (
                  <Card key={provider.id} className="border">
                    <CardContent className="p-4">
                      <Collapsible
                        open={expandedProviders[provider.id]}
                        onOpenChange={() => toggleProvider(provider.id)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {expandedProviders[provider.id] ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                              <Network className="h-5 w-5 text-blue-500" />
                              <div className="text-left">
                                <p className="font-medium">{provider.name}</p>
                                <p className="text-sm text-gray-500">{provider.code}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {provider.models.length} 个模型
                              </Badge>
                              <Badge variant={provider.isActive ? "default" : "secondary"}>
                                {provider.isActive ? "启用" : "禁用"}
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="mt-4 pl-7">
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">API地址: </span>
                                  <span className="font-mono">{provider.baseUrl}</span>
                                </div>
                                <div>
                                  <span className="font-medium">使用智能体: </span>
                                  <span>{provider.agentCount} 个</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">模型列表</h4>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImportPresetModels(provider.id)}
                                  disabled={isSubmitting}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  导入预设模型
                                </Button>
                                <Dialog open={isCreateModelDialogOpen} onOpenChange={setIsCreateModelDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm"
                                      onClick={() => setSelectedProvider(provider)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      添加模型
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>添加模型</DialogTitle>
                                      <DialogDescription>
                                        为 {selectedProvider?.name} 添加新模型
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="model-name">模型名称</Label>
                                          <Input
                                            id="model-name"
                                            value={modelFormData.name}
                                            onChange={(e) => setModelFormData({...modelFormData, name: e.target.value})}
                                            placeholder="例如：GPT-4o"
                                            className={errors.name ? 'border-red-500' : ''}
                                          />
                                          {errors.name && (
                                            <p className="text-xs text-red-500">{errors.name}</p>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="model-code">模型代码</Label>
                                          <Input
                                            id="model-code"
                                            value={modelFormData.code}
                                            onChange={(e) => setModelFormData({...modelFormData, code: e.target.value})}
                                            placeholder="例如：gpt-4o"
                                            className={errors.code ? 'border-red-500' : ''}
                                          />
                                          {errors.code && (
                                            <p className="text-xs text-red-500">{errors.code}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="contextLength">上下文长度</Label>
                                          <Input
                                            id="contextLength"
                                            type="number"
                                            value={modelFormData.contextLength}
                                            onChange={(e) => setModelFormData({...modelFormData, contextLength: parseInt(e.target.value)})}
                                            placeholder="4000"
                                            className={errors.contextLength ? 'border-red-500' : ''}
                                          />
                                          {errors.contextLength && (
                                            <p className="text-xs text-red-500">{errors.contextLength}</p>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="maxTokens">最大Token数</Label>
                                          <Input
                                            id="maxTokens"
                                            type="number"
                                            value={modelFormData.maxTokens}
                                            onChange={(e) => setModelFormData({...modelFormData, maxTokens: parseInt(e.target.value)})}
                                            placeholder="1000"
                                            className={errors.maxTokens ? 'border-red-500' : ''}
                                          />
                                          {errors.maxTokens && (
                                            <p className="text-xs text-red-500">{errors.maxTokens}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>模型能力</Label>
                                        <div className="flex flex-wrap gap-2">
                                          {capabilityOptions.map((capability) => (
                                            <Badge
                                              key={capability.value}
                                              variant={modelFormData.capabilities.includes(capability.value) ? "default" : "outline"}
                                              className="cursor-pointer"
                                              onClick={() => toggleCapability(capability.value)}
                                            >
                                              {capability.label}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-2">
                                        <Switch
                                          id="model-isActive"
                                          checked={modelFormData.isActive}
                                          onCheckedChange={(checked) => setModelFormData({...modelFormData, isActive: checked})}
                                        />
                                        <Label htmlFor="model-isActive">启用模型</Label>
                                      </div>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline" onClick={() => {
                                        setIsCreateModelDialogOpen(false);
                                        resetModelForm();
                                      }}>
                                        取消
                                      </Button>
                                      <Button onClick={handleCreateModel} disabled={isSubmitting}>
                                        {isSubmitting ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            创建中...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="h-4 w-4 mr-2" />
                                            添加模型
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>

                            {provider.models.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 border rounded-lg">
                                暂无模型，点击"添加模型"或"导入预设模型"开始
                              </div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>模型名称</TableHead>
                                    <TableHead>代码</TableHead>
                                    <TableHead>上下文</TableHead>
                                    <TableHead>最大Token</TableHead>
                                    <TableHead>能力</TableHead>
                                    <TableHead>使用数</TableHead>
                                    <TableHead>状态</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {provider.models.map((model) => (
                                    <TableRow key={model.id}>
                                      <TableCell className="font-medium">{model.name}</TableCell>
                                      <TableCell className="font-mono text-sm">{model.code}</TableCell>
                                      <TableCell>{model.contextLength}K</TableCell>
                                      <TableCell>{model.maxTokens}</TableCell>
                                      <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                          {model.capabilities.slice(0, 2).map(cap => (
                                            <Badge key={cap} variant="secondary" className="text-xs">
                                              {capabilityOptions.find(c => c.value === cap)?.label || cap}
                                            </Badge>
                                          ))}
                                          {model.capabilities.length > 2 && (
                                            <Badge variant="outline" className="text-xs">
                                              +{model.capabilities.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{model.agentCount}</TableCell>
                                      <TableCell>
                                        <Badge variant={model.isActive ? "default" : "secondary"}>
                                          {model.isActive ? "启用" : "禁用"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
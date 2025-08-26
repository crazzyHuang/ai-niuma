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
import { Network, Plus, Edit, Trash2, Key, TestTube, Save, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface LLMProvider {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  usageCount: number;
}

const mockProviders: LLMProvider[] = [
  {
    id: '1',
    name: 'DeepSeek',
    code: 'deepseek',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    apiKey: 'ms-752a7d7e-73ce-4931-88c9-d48e7d2ac3f1',
    model: 'deepseek-ai/DeepSeek-V3.1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    usageCount: 1250
  },
  {
    id: '2',
    name: 'OpenAI',
    code: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-...',
    model: 'gpt-4o-mini',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    usageCount: 0
  }
];

const providerTemplates = [
  {
    name: 'DeepSeek',
    code: 'deepseek',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3.1',
    description: '性价比高的中文模型'
  },
  {
    name: 'OpenAI',
    code: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    description: '功能强大的多语言模型'
  },
  {
    name: 'Anthropic Claude',
    code: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    description: '注重安全的对话模型'
  },
  {
    name: 'Google Gemini',
    code: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    model: 'gemini-pro',
    description: 'Google的最新生成模型'
  }
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>(mockProviders);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    baseUrl: '',
    apiKey: '',
    model: '',
    isActive: true
  });

  const handleCreate = () => {
    const newProvider: LLMProvider = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code,
      baseUrl: formData.baseUrl,
      apiKey: formData.apiKey,
      model: formData.model,
      isActive: formData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      usageCount: 0
    };
    setProviders([...providers, newProvider]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = (provider: LLMProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      code: provider.code,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model,
      isActive: provider.isActive
    });
  };

  const handleUpdate = () => {
    if (!editingProvider) return;
    setProviders(providers.map(provider =>
      provider.id === editingProvider.id
        ? { ...provider, ...formData, updatedAt: new Date() }
        : provider
    ));
    setEditingProvider(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setProviders(providers.filter(provider => provider.id !== id));
  };

  const handleTestConnection = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    console.log('测试连接:', provider.name);
    // 这里应该实现实际的连接测试
    alert(`测试连接到 ${provider.name}...`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      baseUrl: '',
      apiKey: '',
      model: '',
      isActive: true
    });
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const applyTemplate = (template: typeof providerTemplates[0]) => {
    setFormData({
      name: template.name,
      code: template.code,
      baseUrl: template.baseUrl,
      apiKey: '',
      model: template.model,
      isActive: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link href="/admin">← 返回管理后台</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">LLM提供商管理</h1>
                <p className="text-gray-600">配置和管理AI模型提供商</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新增提供商
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>添加LLM提供商</DialogTitle>
                  <DialogDescription>
                    配置新的AI模型提供商和API密钥
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
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="例如：DeepSeek"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">代码标识</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        placeholder="例如：deepseek"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">API基础URL</Label>
                    <Input
                      id="baseUrl"
                      value={formData.baseUrl}
                      onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API密钥</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="apiKey"
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                        placeholder="输入API密钥"
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm">
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">默认模型</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      placeholder="例如：gpt-4o-mini"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <Label htmlFor="isActive">启用提供商</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate}>
                    <Save className="h-4 w-4 mr-2" />
                    添加提供商
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Providers Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>提供商列表</CardTitle>
            <CardDescription>
              管理系统中的AI模型提供商，共 {providers.length} 个提供商
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>提供商</TableHead>
                  <TableHead>基础URL</TableHead>
                  <TableHead>默认模型</TableHead>
                  <TableHead>API密钥</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>使用次数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Network className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-gray-500">{provider.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{provider.baseUrl}</TableCell>
                    <TableCell>{provider.model}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm">
                          {showApiKeys[provider.id] ? provider.apiKey : maskApiKey(provider.apiKey)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(provider.id)}
                        >
                          {showApiKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.isActive ? "default" : "secondary"}>
                        {provider.isActive ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell>{provider.usageCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConnection(provider.id)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(provider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {editingProvider && (
        <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑提供商</DialogTitle>
              <DialogDescription>
                修改LLM提供商的配置信息
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">提供商名称</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">代码标识</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-baseUrl">API基础URL</Label>
                <Input
                  id="edit-baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-apiKey">API密钥</Label>
                <Input
                  id="edit-apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-model">默认模型</Label>
                <Input
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="edit-isActive">启用提供商</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingProvider(null)}>
                取消
              </Button>
              <Button onClick={handleUpdate}>
                <Save className="h-4 w-4 mr-2" />
                保存更改
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
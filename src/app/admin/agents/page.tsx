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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Plus, Edit, Trash2, Eye, EyeOff, Copy, Save } from 'lucide-react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  code: string;
  description?: string;
  avatar?: string;
  color: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  model?: {
    id: string;
    name: string;
    code: string;
    provider: {
      name: string;
      code: string;
    };
  };
}

interface LLMProvider {
  id: string;
  name: string;
  code: string;
  models: LLMModel[];
}

interface Provider {
  id: string;
  name: string;
  code: string;
}

interface LLMModel {
  id: string;
  name: string;
  code: string;
  description?: string;
  contextLength: number;
  capabilities: string[];
}

const mockProviders: LLMProvider[] = [
  {
    id: '1',
    name: 'DeepSeek',
    code: 'deepseek',
    models: [
      {
        id: '1',
        name: 'DeepSeek-V3.1',
        code: 'deepseek-ai/DeepSeek-V3.1',
        description: 'DeepSeek最新大语言模型',
        contextLength: 128000,
        capabilities: ['chat', 'reasoning', 'coding']
      },
      {
        id: '2',
        name: 'DeepSeek-V2.5',
        code: 'deepseek-ai/DeepSeek-V2.5',
        description: 'DeepSeek高性能模型',
        contextLength: 32000,
        capabilities: ['chat', 'reasoning']
      }
    ]
  },
  {
    id: '2',
    name: 'OpenAI',
    code: 'openai',
    models: [
      {
        id: '3',
        name: 'GPT-4o-mini',
        code: 'gpt-4o-mini',
        description: 'OpenAI高效模型',
        contextLength: 128000,
        capabilities: ['chat', 'vision', 'tools']
      },
      {
        id: '4',
        name: 'GPT-4o',
        code: 'gpt-4o',
        description: 'OpenAI旗舰模型',
        contextLength: 128000,
        capabilities: ['chat', 'vision', 'tools', 'reasoning']
      }
    ]
  }
];

// 为mock数据创建provider映射
const providerMap: Record<string, Provider> = {
  '1': { id: '1', name: 'DeepSeek', code: 'deepseek' },
  '2': { id: '2', name: 'OpenAI', code: 'openai' }
};

const mockAgents: Agent[] = [
  {
    id: '1',
    name: '共情者小暖',
    code: 'EMPATHY',
    description: '第一个回应者，负责情感共鸣和关心',
    color: '#EF4444',
    temperature: 0.8,
    maxTokens: 800,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    model: {
      id: '1',
      name: 'DeepSeek-V3.1',
      code: 'deepseek-ai/DeepSeek-V3.1',
      provider: { name: 'DeepSeek', code: 'deepseek' }
    }
  },
  {
    id: '2',
    name: '建议者小智',
    code: 'PRACTICAL',
    description: '实用问题解决专家',
    color: '#3B82F6',
    temperature: 0.5,
    maxTokens: 1000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    model: {
      id: '1',
      name: 'DeepSeek-V3.1',
      code: 'deepseek-ai/DeepSeek-V3.1',
      provider: { name: 'DeepSeek', code: 'deepseek' }
    }
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#3B82F6',
    temperature: 0.8,
    maxTokens: 1000,
    isActive: true,
    prompt: '',
    providerId: '',
    modelId: ''
  });


  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      code: agent.code,
      description: agent.description || '',
      color: agent.color,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isActive: agent.isActive,
      prompt: '',
      providerId: agent.model?.provider.code || '', // 使用code作为标识
      modelId: agent.model?.id || ''
    });
  };

  const handleCreate = () => {
    const selectedProvider = mockProviders.find(p => p.id === formData.providerId);
    const selectedModel = selectedProvider?.models.find(m => m.id === formData.modelId);

    const newAgent: Agent = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code,
      description: formData.description,
      color: formData.color,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      isActive: formData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      model: selectedModel && selectedProvider ? {
        id: selectedModel.id,
        name: selectedModel.name,
        code: selectedModel.code,
        provider: { name: selectedProvider.name, code: selectedProvider.code }
      } : undefined
    };
    setAgents([...agents, newAgent]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingAgent) return;
    setAgents(agents.map(agent =>
      agent.id === editingAgent.id
        ? { ...agent, ...formData, updatedAt: new Date() }
        : agent
    ));
    setEditingAgent(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setAgents(agents.filter(agent => agent.id !== id));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      color: '#3B82F6',
      temperature: 0.8,
      maxTokens: 1000,
      isActive: true,
      prompt: '',
      providerId: '',
      modelId: ''
    });
  };

  const getColorPreview = (color: string) => {
    return { backgroundColor: color };
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
                <h1 className="text-2xl font-bold text-gray-900">智能体管理</h1>
                <p className="text-gray-600">创建和管理AI智能体配置</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新建智能体
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建新智能体</DialogTitle>
                  <DialogDescription>
                    配置智能体的基本信息和参数设置
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">智能体名称</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="例如：共情者小暖"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">代码标识</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        placeholder="例如：EMPATHY"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="描述这个智能体的角色和功能"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">LLM厂家</Label>
                      <Select value={formData.providerId} onValueChange={(value) => setFormData({...formData, providerId: value, modelId: ''})}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择厂家" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockProviders.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name} ({provider.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">模型选择</Label>
                      <Select
                        value={formData.modelId}
                        onValueChange={(value) => setFormData({...formData, modelId: value})}
                        disabled={!formData.providerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockProviders
                            .find(p => p.id === formData.providerId)
                            ?.models.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({model.contextLength}K)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">主题颜色</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({...formData, color: e.target.value})}
                          className="w-16"
                        />
                        <div
                          className="flex-1 rounded border flex items-center justify-center text-white font-medium"
                          style={getColorPreview(formData.color)}
                        >
                          预览
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperature">温度参数</Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxTokens">最大Token数</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        value={formData.maxTokens}
                        onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prompt">系统提示词</Label>
                    <Textarea
                      id="prompt"
                      value={formData.prompt}
                      onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                      placeholder="输入智能体的系统提示词..."
                      rows={6}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <Label htmlFor="isActive">启用智能体</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate}>
                    <Save className="h-4 w-4 mr-2" />
                    创建智能体
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>智能体列表</CardTitle>
            <CardDescription>
              管理系统中的所有AI智能体，共 {agents.length} 个智能体
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>智能体</TableHead>
                  <TableHead>代码标识</TableHead>
                  <TableHead>提供商</TableHead>
                  <TableHead>温度</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: agent.color }}>
                            <Bot className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.code}</Badge>
                    </TableCell>
                    <TableCell>
                      {agent.model ? (
                        <div className="flex flex-col space-y-1">
                          <Badge variant="secondary">{agent.model.provider.name}</Badge>
                          <span className="text-xs text-gray-500">{agent.model.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">未设置</span>
                      )}
                    </TableCell>
                    <TableCell>{agent.temperature}</TableCell>
                    <TableCell>
                      <Badge variant={agent.isActive ? "default" : "secondary"}>
                        {agent.isActive ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(agent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(agent.id)}
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
      {editingAgent && (
        <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑智能体</DialogTitle>
              <DialogDescription>
                修改智能体的配置信息
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">智能体名称</Label>
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
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-color">主题颜色</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="edit-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-16"
                    />
                    <div
                      className="flex-1 rounded border flex items-center justify-center text-white font-medium"
                      style={getColorPreview(formData.color)}
                    >
                      预览
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-temperature">温度参数</Label>
                  <Input
                    id="edit-temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-maxTokens">最大Token数</Label>
                  <Input
                    id="edit-maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="edit-isActive">启用智能体</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingAgent(null)}>
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
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
import { Bot, Plus, Edit, Trash2, Eye, EyeOff, Copy, Save, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Loader2, Info } from 'lucide-react';
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
  prompt?: string;
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
  baseUrl: string;
  isActive: boolean;
  models: LLMModel[];
  agentCount: number;
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

// 移除mock数据，改为从API获取

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [editCurrentStep, setEditCurrentStep] = useState(1);
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

  // 加载数据
  useEffect(() => {
    loadAgents();
    loadProviders();
  }, []);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/agents');
      const result = await response.json();
      
      if (result.success) {
        setAgents(result.data);
      } else {
        console.error('加载智能体失败:', result.error);
      }
    } catch (error) {
      console.error('加载智能体失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/admin/providers');
      const result = await response.json();
      
      if (result.success) {
        setProviders(result.data);
      } else {
        console.error('加载提供商失败:', result.error);
      }
    } catch (error) {
      console.error('加载提供商失败:', error);
    }
  };


  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setEditCurrentStep(1);
    // 根据 agent 的 modelId 找到对应的 provider
    const selectedModel = providers.flatMap(p => p.models).find(m => m.id === agent.model?.id);
    const selectedProviderId = providers.find(p => p.models.some(m => m.id === agent.model?.id))?.id || '';
    
    setFormData({
      name: agent.name,
      code: agent.code,
      description: agent.description || '',
      color: agent.color,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isActive: agent.isActive,
      prompt: agent.prompt || '', // 从API返回的数据中获取提示词
      providerId: selectedProviderId,
      modelId: agent.model?.id || ''
    });
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim(),
          color: formData.color,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          prompt: formData.prompt.trim(),
          modelId: formData.modelId,
          isActive: formData.isActive,
          userId: 'system' // 实际应用中从session获取
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAgents([...agents, result.data]);
        setIsCreateDialogOpen(false);
        resetForm();
        setCurrentStep(1);
        setErrors({});
        console.log('智能体创建成功:', result.message);
      } else {
        console.error('创建失败:', result.error);
        // 如果是代码重复错误，显示在相应字段
        if (result.error.includes('代码标识已存在')) {
          setErrors({code: result.details || result.error});
        } else {
          alert(`创建失败: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('创建智能体失败:', error);
      alert('创建智能体失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAgent) return;
    
    try {
      const response = await fetch(`/api/admin/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          color: formData.color,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          prompt: formData.prompt,
          modelId: formData.modelId,
          isActive: formData.isActive
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAgents(agents.map(agent =>
          agent.id === editingAgent.id ? result.data : agent
        ));
        setEditingAgent(null);
        resetForm();
        console.log('智能体更新成功:', result.message);
      } else {
        console.error('更新失败:', result.error);
        alert(`更新失败: ${result.error}`);
      }
    } catch (error) {
      console.error('更新智能体失败:', error);
      alert('更新智能体失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个智能体吗？')) return;
    
    try {
      const response = await fetch(`/api/admin/agents/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.data.deleted) {
          // 完全删除
          setAgents(agents.filter(agent => agent.id !== id));
          console.log('智能体已删除');
        } else {
          // 只是禁用
          setAgents(agents.map(agent =>
            agent.id === id ? { ...agent, isActive: false } : agent
          ));
          console.log('智能体已禁用（保留历史记录）');
        }
      } else {
        console.error('删除失败:', result.error);
        alert(`删除失败: ${result.error}`);
      }
    } catch (error) {
      console.error('删除智能体失败:', error);
      alert('删除智能体失败，请重试');
    }
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
    setErrors({});
    setCurrentStep(1);
  };

  const getColorPreview = (color: string) => {
    return { backgroundColor: color };
  };

  // 检查表单验证状态（不更新错误状态）
  const isFormValid = () => {
    return formData.name.trim() &&
           formData.code.trim() &&
           /^[A-Z][A-Z0-9_]*$/.test(formData.code) &&
           formData.modelId &&
           formData.prompt.trim() &&
           formData.temperature >= 0 && formData.temperature <= 2 &&
           formData.maxTokens >= 1 && formData.maxTokens <= 32000 &&
           Object.keys(errors).length === 0;
  };

  // 输入验证（会设置错误状态）
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '智能体名称不能为空';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = '代码标识不能为空';
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(formData.code)) {
      newErrors.code = '代码标识必须以大写字母开头，只能包含大写字母、数字和下划线';
    }
    
    if (!formData.modelId) {
      newErrors.modelId = '请选择模型';
    }
    
    if (!formData.prompt.trim()) {
      newErrors.prompt = '系统提示词不能为空';
    }
    
    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = '温度参数必须在0-2之间';
    }
    
    if (formData.maxTokens < 1 || formData.maxTokens > 32000) {
      newErrors.maxTokens = '最大Token数必须在1-32000之间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 实时验证单个字段
  const validateField = (fieldName: string, value: any) => {
    const newErrors = { ...errors };
    delete newErrors[fieldName];
    
    switch (fieldName) {
      case 'name':
        if (!value.trim()) newErrors.name = '智能体名称不能为空';
        break;
      case 'code':
        if (!value.trim()) {
          newErrors.code = '代码标识不能为空';
        } else if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
          newErrors.code = '代码标识必须以大写字母开头，只能包含大写字母、数字和下划线';
        }
        break;
      case 'modelId':
        if (!value) newErrors.modelId = '请选择模型';
        break;
      case 'prompt':
        if (!value.trim()) newErrors.prompt = '系统提示词不能为空';
        break;
      case 'maxTokens':
        if (value < 1 || value > 32000) {
          newErrors.maxTokens = '最大Token数必须在1-32000之间';
        }
        break;
    }
    
    // 只有当错误状态真正发生变化时才更新
    if (JSON.stringify(newErrors) !== JSON.stringify(errors)) {
      setErrors(newErrors);
    }
  };

  // 获取选中的模型信息
  const getSelectedModel = () => {
    if (!formData.modelId) return null;
    return providers.flatMap(p => p.models).find(m => m.id === formData.modelId);
  };

  const getSelectedProvider = () => {
    if (!formData.providerId) return null;
    return providers.find(p => p.id === formData.providerId);
  };

  // 步骤验证（不触发状态更新）
  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return formData.name.trim() && 
               formData.code.trim() && 
               /^[A-Z][A-Z0-9_]*$/.test(formData.code) &&
               !errors.name && 
               !errors.code;
      case 3:
        return formData.modelId && !errors.modelId;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">智能体管理</h1>
          <p className="mt-2 text-gray-600">创建和管理AI智能体配置</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              新建智能体
            </Button>
          </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    创建新智能体
                  </DialogTitle>
                  <DialogDescription>
                    按照步骤配置您的AI智能体
                  </DialogDescription>
                </DialogHeader>

                {/* 步骤指示器 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                          ${currentStep === step 
                            ? 'bg-primary text-primary-foreground' 
                            : currentStep > step 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-500'
                          }
                        `}>
                          {currentStep > step ? <CheckCircle className="h-4 w-4" /> : step}
                        </div>
                        <div className="ml-2 text-sm">
                          {step === 1 && '基本信息'}
                          {step === 2 && '模型选择'}
                          {step === 3 && '配置参数'}
                        </div>
                        {step < 3 && <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[60vh]">
                  {/* 步骤1: 基本信息 */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="flex items-center gap-1">
                            智能体名称 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({...formData, name: e.target.value});
                              validateField('name', e.target.value);
                            }}
                            placeholder="例如：共情者小暖"
                            className={errors.name ? 'border-red-500' : ''}
                          />
                          {errors.name && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code" className="flex items-center gap-1">
                            代码标识 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="code"
                            value={formData.code}
                            onChange={(e) => {
                              const upperValue = e.target.value.toUpperCase();
                              setFormData({...formData, code: upperValue});
                              validateField('code', upperValue);
                            }}
                            placeholder="例如：EMPATHY"
                            className={errors.code ? 'border-red-500' : ''}
                          />
                          {errors.code && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.code}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            用于系统内部识别，必须以大写字母开头
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">描述信息</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="简要描述这个智能体的角色和功能..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color">主题颜色</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="color"
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                            className="w-20"
                          />
                          <div
                            className="flex-1 rounded border flex items-center justify-center text-white font-medium h-10"
                            style={getColorPreview(formData.color)}
                          >
                            {formData.name || '智能体预览'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 步骤2: 模型选择 */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">选择AI模型</span>
                        </div>
                        <p className="text-xs text-blue-600">
                          选择适合您智能体的AI模型，不同模型有不同的能力和特点
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="provider">AI厂家</Label>
                          <Select 
                            value={formData.providerId} 
                            onValueChange={(value) => {
                              setFormData({...formData, providerId: value, modelId: ''});
                              setErrors({...errors, modelId: ''});
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择厂家" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.map(provider => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">{provider.name}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {provider.models.length} 个模型
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model" className="flex items-center gap-1">
                            模型选择 <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.modelId}
                            onValueChange={(value) => {
                              setFormData({...formData, modelId: value});
                              validateField('modelId', value);
                            }}
                            disabled={!formData.providerId}
                          >
                            <SelectTrigger className={errors.modelId ? 'border-red-500' : ''}>
                              <SelectValue placeholder={formData.providerId ? "选择模型" : "请先选择厂家"} />
                            </SelectTrigger>
                            <SelectContent>
                              {providers
                                .find(p => p.id === formData.providerId)
                                ?.models.map(model => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{model.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {model.contextLength}K 上下文 • {model.maxTokens} Token
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.modelId && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.modelId}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 选中模型的详细信息 */}
                      {getSelectedModel() && (
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-4 w-4" />
                            <span className="font-medium">已选择模型</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>模型名称:</span>
                              <span className="font-medium">{getSelectedModel()?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>提供商:</span>
                              <span>{getSelectedProvider()?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>上下文长度:</span>
                              <span>{getSelectedModel()?.contextLength}K tokens</span>
                            </div>
                            <div className="flex justify-between">
                              <span>最大输出:</span>
                              <span>{getSelectedModel()?.maxTokens} tokens</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span>能力:</span>
                              <div className="flex flex-wrap gap-1">
                                {getSelectedModel()?.capabilities.map(cap => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* 步骤3: 配置参数 */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="prompt" className="flex items-center gap-1">
                          系统提示词 <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="prompt"
                          value={formData.prompt}
                          onChange={(e) => {
                            setFormData({...formData, prompt: e.target.value});
                            validateField('prompt', e.target.value);
                          }}
                          placeholder="定义智能体的角色、行为和回复风格..."
                          rows={6}
                          className={errors.prompt ? 'border-red-500' : ''}
                        />
                        {errors.prompt && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.prompt}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          这是智能体的核心配置，定义了它的性格和行为模式
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="temperature">
                            温度参数 ({formData.temperature})
                          </Label>
                          <Input
                            id="temperature"
                            type="range"
                            step="0.1"
                            min="0"
                            max="2"
                            value={formData.temperature}
                            onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>保守 (0.0)</span>
                            <span>创造性 (2.0)</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxTokens">最大Token数</Label>
                          <Input
                            id="maxTokens"
                            type="number"
                            min="1"
                            max="32000"
                            value={formData.maxTokens}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setFormData({...formData, maxTokens: value});
                              validateField('maxTokens', value);
                            }}
                            className={errors.maxTokens ? 'border-red-500' : ''}
                          />
                          {errors.maxTokens && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.maxTokens}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                        />
                        <Label htmlFor="isActive">立即启用智能体</Label>
                      </div>

                      {/* 预览卡片 */}
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4" />
                          <span className="font-medium">智能体预览</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback style={{ backgroundColor: formData.color }}>
                              <Bot className="h-5 w-5 text-white" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{formData.name || '未命名智能体'}</p>
                            <p className="text-sm text-gray-500">{formData.description || '暂无描述'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{formData.code || 'CODE'}</Badge>
                              {getSelectedModel() && (
                                <Badge variant="secondary">{getSelectedModel()?.name}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>

                {/* 底部按钮 */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      取消
                    </Button>
                    {currentStep > 1 && (
                      <Button 
                        variant="outline"
                        onClick={() => setCurrentStep(currentStep - 1)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        上一步
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {currentStep < 3 ? (
                      <Button 
                        onClick={() => setCurrentStep(currentStep + 1)}
                        disabled={!canProceedToStep(currentStep + 1)}
                      >
                        下一步
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleCreate}
                        disabled={isSubmitting || !isFormValid()}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            创建中...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            创建智能体
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
      </div>

      {/* Agents Table */}
      <Card>
          <CardHeader>
            <CardTitle>智能体列表</CardTitle>
            <CardDescription>
              管理系统中的所有AI智能体，共 {agents.length} 个智能体
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">加载智能体中...</p>
                </div>
              </div>
            ) : (
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
                  {agents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无智能体，点击"新建智能体"开始创建
                      </TableCell>
                    </TableRow>
                  ) : (
                    agents.map((agent) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      {/* Edit Dialog */}
      {editingAgent && (
        <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                编辑智能体
              </DialogTitle>
              <DialogDescription>
                修改智能体的配置信息
              </DialogDescription>
            </DialogHeader>

            {/* 步骤指示器 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${editCurrentStep === step 
                        ? 'bg-primary text-primary-foreground' 
                        : editCurrentStep > step 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {editCurrentStep > step ? <CheckCircle className="h-4 w-4" /> : step}
                    </div>
                    <div className="ml-2 text-sm">
                      {step === 1 && '基本信息'}
                      {step === 2 && '模型选择'}
                      {step === 3 && '配置参数'}
                    </div>
                    {step < 3 && <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {/* 步骤1: 基本信息 */}
              {editCurrentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="flex items-center gap-1">
                        智能体名称 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value});
                          validateField('name', e.target.value);
                        }}
                        placeholder="例如：共情者小暖"
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-code" className="flex items-center gap-1">
                        代码标识 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-code"
                        value={formData.code}
                        onChange={(e) => {
                          const upperValue = e.target.value.toUpperCase();
                          setFormData({...formData, code: upperValue});
                          validateField('code', upperValue);
                        }}
                        placeholder="例如：EMPATHY"
                        className={errors.code ? 'border-red-500' : ''}
                      />
                      {errors.code && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.code}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        用于系统内部识别，必须以大写字母开头
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">描述信息</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="简要描述这个智能体的角色和功能..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-color">主题颜色</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="edit-color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-20"
                      />
                      <div
                        className="flex-1 rounded border flex items-center justify-center text-white font-medium h-10"
                        style={getColorPreview(formData.color)}
                      >
                        {formData.name || '智能体预览'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤2: 模型选择 */}
              {editCurrentStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">选择AI模型</span>
                    </div>
                    <p className="text-xs text-blue-600">
                      选择适合您智能体的AI模型，不同模型有不同的能力和特点
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-provider">AI厂家</Label>
                      <Select 
                        value={formData.providerId} 
                        onValueChange={(value) => {
                          setFormData({...formData, providerId: value, modelId: ''});
                          setErrors({...errors, modelId: ''});
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择厂家" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{provider.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {provider.models.length} 个模型
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-model" className="flex items-center gap-1">
                        模型选择 <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.modelId}
                        onValueChange={(value) => {
                          setFormData({...formData, modelId: value});
                          validateField('modelId', value);
                        }}
                        disabled={!formData.providerId}
                      >
                        <SelectTrigger className={errors.modelId ? 'border-red-500' : ''}>
                          <SelectValue placeholder={formData.providerId ? "选择模型" : "请先选择厂家"} />
                        </SelectTrigger>
                        <SelectContent>
                          {providers
                            .find(p => p.id === formData.providerId)
                            ?.models.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {model.contextLength}K 上下文 • {model.maxTokens} Token
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.modelId && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.modelId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 选中模型的详细信息 */}
                  {getSelectedModel() && (
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4" />
                        <span className="font-medium">已选择模型</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>模型名称:</span>
                          <span className="font-medium">{getSelectedModel()?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>提供商:</span>
                          <span>{getSelectedProvider()?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>上下文长度:</span>
                          <span>{getSelectedModel()?.contextLength}K tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span>最大输出:</span>
                          <span>{getSelectedModel()?.maxTokens} tokens</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span>能力:</span>
                          <div className="flex flex-wrap gap-1">
                            {getSelectedModel()?.capabilities.map(cap => (
                              <Badge key={cap} variant="secondary" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* 步骤3: 配置参数 */}
              {editCurrentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-prompt" className="flex items-center gap-1">
                      系统提示词 <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="edit-prompt"
                      value={formData.prompt}
                      onChange={(e) => {
                        setFormData({...formData, prompt: e.target.value});
                        validateField('prompt', e.target.value);
                      }}
                      placeholder="定义智能体的角色、行为和回复风格..."
                      rows={6}
                      className={errors.prompt ? 'border-red-500' : ''}
                    />
                    {errors.prompt && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.prompt}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      这是智能体的核心配置，定义了它的性格和行为模式
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-temperature">
                        温度参数 ({formData.temperature})
                      </Label>
                      <Input
                        id="edit-temperature"
                        type="range"
                        step="0.1"
                        min="0"
                        max="2"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>保守 (0.0)</span>
                        <span>创造性 (2.0)</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-maxTokens">最大Token数</Label>
                      <Input
                        id="edit-maxTokens"
                        type="number"
                        min="1"
                        max="32000"
                        value={formData.maxTokens}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setFormData({...formData, maxTokens: value});
                          validateField('maxTokens', value);
                        }}
                        className={errors.maxTokens ? 'border-red-500' : ''}
                      />
                      {errors.maxTokens && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.maxTokens}
                        </p>
                      )}
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

                  {/* 预览卡片 */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">智能体预览</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: formData.color }}>
                          <Bot className="h-5 w-5 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{formData.name || '未命名智能体'}</p>
                        <p className="text-sm text-gray-500">{formData.description || '暂无描述'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{formData.code || 'CODE'}</Badge>
                          {getSelectedModel() && (
                            <Badge variant="secondary">{getSelectedModel()?.name}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingAgent(null);
                    resetForm();
                    setEditCurrentStep(1);
                  }}
                >
                  取消
                </Button>
                {editCurrentStep > 1 && (
                  <Button 
                    variant="outline"
                    onClick={() => setEditCurrentStep(editCurrentStep - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    上一步
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                {editCurrentStep < 3 ? (
                  <Button 
                    onClick={() => setEditCurrentStep(editCurrentStep + 1)}
                    disabled={!canProceedToStep(editCurrentStep + 1)}
                  >
                    下一步
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleUpdate}
                    disabled={isSubmitting || !isFormValid()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        保存更改
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
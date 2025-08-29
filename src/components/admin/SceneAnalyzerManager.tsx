'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Settings, Trash2, Edit, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface LLMProvider {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface LLMModel {
  id: string;
  name: string;
  isActive: boolean;
}

interface SceneAnalyzer {
  id: string;
  name: string;
  description?: string;
  providerId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  isActive: boolean;
  provider: LLMProvider;
  model: LLMModel;
  createdAt: string;
}

export default function SceneAnalyzerManager() {
  const [sceneAnalyzers, setSceneAnalyzers] = useState<SceneAnalyzer[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAnalyzer, setEditingAnalyzer] = useState<SceneAnalyzer | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    providerId: '',
    modelId: '',
    temperature: 0.3,
    maxTokens: 2000,
    systemPrompt: '',
    isActive: false
  });

  useEffect(() => {
    loadSceneAnalyzers();
    loadProviders();
  }, []);

  useEffect(() => {
    if (formData.providerId) {
      loadModels(formData.providerId);
    }
  }, [formData.providerId]);

  const loadSceneAnalyzers = async () => {
    try {
      const response = await fetch('/api/admin/scene-analyzers');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSceneAnalyzers(result.data);
        } else {
          console.error('Load scene analyzers failed:', result.error);
          toast.error(`加载场景分析器失败: ${result.error}`);
        }
      } else {
        toast.error('加载场景分析器失败');
      }
    } catch (error) {
      console.error('Load scene analyzers error:', error);
      toast.error('加载场景分析器时出错');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/admin/providers');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProviders(result.data.filter((p: LLMProvider) => p.isActive));
        } else {
          console.error('Load providers failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Load providers error:', error);
    }
  };

  const loadModels = async (providerId: string) => {
    try {
      const response = await fetch(`/api/admin/models?providerId=${providerId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setModels(result.data.filter((m: LLMModel) => m.isActive));
        } else {
          console.error('Load models failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Load models error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      providerId: '',
      modelId: '',
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: '',
      isActive: false
    });
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/scene-analyzers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('场景分析器创建成功');
        setIsCreateDialogOpen(false);
        resetForm();
        loadSceneAnalyzers();
      } else {
        const error = await response.json();
        toast.error(`创建失败: ${error.error}`);
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('创建场景分析器时出错');
    }
  };

  const handleEdit = (analyzer: SceneAnalyzer) => {
    setEditingAnalyzer(analyzer);
    setFormData({
      name: analyzer.name,
      description: analyzer.description || '',
      providerId: analyzer.providerId,
      modelId: analyzer.modelId,
      temperature: analyzer.temperature,
      maxTokens: analyzer.maxTokens,
      systemPrompt: analyzer.systemPrompt,
      isActive: analyzer.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAnalyzer) return;

    try {
      const response = await fetch(`/api/admin/scene-analyzers/${editingAnalyzer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('场景分析器更新成功');
        setIsEditDialogOpen(false);
        setEditingAnalyzer(null);
        resetForm();
        loadSceneAnalyzers();
      } else {
        const error = await response.json();
        toast.error(`更新失败: ${error.error}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('更新场景分析器时出错');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个场景分析器吗？')) return;

    try {
      const response = await fetch(`/api/admin/scene-analyzers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('场景分析器删除成功');
        loadSceneAnalyzers();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除场景分析器时出错');
    }
  };

  const toggleActive = async (analyzer: SceneAnalyzer) => {
    try {
      const response = await fetch(`/api/admin/scene-analyzers/${analyzer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...analyzer, isActive: !analyzer.isActive }),
      });

      if (response.ok) {
        toast.success(`场景分析器已${!analyzer.isActive ? '激活' : '停用'}`);
        loadSceneAnalyzers();
      } else {
        toast.error('切换状态失败');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('切换状态时出错');
    }
  };

  const DialogForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名称 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="场景分析器名称"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="描述这个场景分析器的功能"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="provider">AI提供商 *</Label>
          <Select
            value={formData.providerId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, providerId: value, modelId: '' }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择提供商" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">AI模型 *</Label>
          <Select
            value={formData.modelId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, modelId: value }))}
            disabled={!formData.providerId}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="temperature">温度</Label>
          <Input
            id="temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">最大Token数</Label>
          <Input
            id="maxTokens"
            type="number"
            min="100"
            max="8000"
            value={formData.maxTokens}
            onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">系统提示词 *</Label>
        <Textarea
          id="systemPrompt"
          value={formData.systemPrompt}
          onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
          placeholder="定义场景分析器的行为和输出格式..."
          className="min-h-32"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label>设为活跃（只能有一个活跃的场景分析器）</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={() => {
            if (isEdit) {
              setIsEditDialogOpen(false);
              setEditingAnalyzer(null);
            } else {
              setIsCreateDialogOpen(false);
            }
            resetForm();
          }}
        >
          取消
        </Button>
        <Button onClick={isEdit ? handleUpdate : handleCreate}>
          {isEdit ? '更新' : '创建'}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            场景分析器管理
          </h2>
          <p className="text-muted-foreground mt-1">
            配置和管理场景分析AI，支持动态切换不同的AI提供商
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              创建场景分析器
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建场景分析器</DialogTitle>
            </DialogHeader>
            <DialogForm />
          </DialogContent>
        </Dialog>
      </div>

      {sceneAnalyzers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">暂无场景分析器配置</p>
            <p className="text-sm text-gray-500 mt-2">点击上方按钮创建您的第一个场景分析器</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sceneAnalyzers.map((analyzer) => (
            <Card key={analyzer.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {analyzer.name}
                      {analyzer.isActive && (
                        <Badge className="bg-green-100 text-green-800">活跃</Badge>
                      )}
                    </CardTitle>
                    {analyzer.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {analyzer.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(analyzer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={analyzer.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleActive(analyzer)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(analyzer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">提供商:</span>
                    <p className="text-muted-foreground">{analyzer.provider.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">模型:</span>
                    <p className="text-muted-foreground">{analyzer.model.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">温度:</span>
                    <p className="text-muted-foreground">{analyzer.temperature}</p>
                  </div>
                  <div>
                    <span className="font-medium">最大Token:</span>
                    <p className="text-muted-foreground">{analyzer.maxTokens}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="font-medium">系统提示词:</span>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {analyzer.systemPrompt}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑场景分析器</DialogTitle>
          </DialogHeader>
          <DialogForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}
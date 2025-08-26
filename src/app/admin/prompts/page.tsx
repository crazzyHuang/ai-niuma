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
import { FileText, Plus, Edit, Trash2, Sparkles, Copy, Save, Wand2 } from 'lucide-react';
import Link from 'next/link';

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

const mockPrompts: PromptTemplate[] = [
  {
    id: '1',
    name: '共情回应模板',
    category: 'empathy',
    content: '你是一个富有同理心的AI助手，名叫{name}。你的主要任务是理解和感受用户的情感，提供温暖的共情回应。\n\n你的特点：\n- 温暖、耐心、善于倾听\n- 能够敏锐地感受到用户的情绪变化\n- 用温和的语言表达理解和关怀\n\n请基于用户分享的内容，给出温暖的共情回应。',
    description: '用于生成共情性回应的基础模板',
    tags: ['共情', '情感支持', '温暖'],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 245
  },
  {
    id: '2',
    name: '实用建议模板',
    category: 'practical',
    content: '你是一个实用的问题解决专家，名叫{name}。基于用户的情况，你需要提供具体、可操作的建议和解决方案。\n\n你的特点：\n- 逻辑清晰，思路缜密\n- 提供具体可行的行动步骤\n- 考虑用户的实际情况和能力\n\n请基于用户的问题，提供实用的建议和解决方案。',
    description: '用于生成实用建议的专业模板',
    tags: ['建议', '解决方案', '实用'],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 189
  }
];

const categories = [
  { value: 'common', label: '通用' },
  { value: 'empathy', label: '共情' },
  { value: 'practical', label: '实用' },
  { value: 'creative', label: '创意' },
  { value: 'analytical', label: '分析' }
];

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>(mockPrompts);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'common',
    content: '',
    description: '',
    tags: '',
    isPublic: true
  });

  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreate = () => {
    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category,
      content: formData.content,
      description: formData.description,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      isPublic: formData.isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };
    setPrompts([...prompts, newPrompt]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = (prompt: PromptTemplate) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      category: prompt.category,
      content: prompt.content,
      description: prompt.description || '',
      tags: prompt.tags.join(', '),
      isPublic: prompt.isPublic
    });
  };

  const handleUpdate = () => {
    if (!editingPrompt) return;
    setPrompts(prompts.map(prompt =>
      prompt.id === editingPrompt.id
        ? {
            ...prompt,
            ...formData,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            updatedAt: new Date()
          }
        : prompt
    ));
    setEditingPrompt(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setPrompts(prompts.filter(prompt => prompt.id !== id));
  };

  const handleBeautifyPrompt = async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      console.log('正在美化提示词:', prompt.name);

      const response = await fetch('/api/admin/prompts/beautify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: prompt.content }),
      });

      if (!response.ok) {
        throw new Error('美化请求失败');
      }

      const result = await response.json();

      setPrompts(prompts.map(p =>
        p.id === promptId
          ? { ...p, content: result.beautifiedContent, updatedAt: new Date() }
          : p
      ));

      // 这里可以显示成功提示
      alert(`提示词美化完成！\n\n优化内容：\n${result.improvements.join('\n')}`);

    } catch (error) {
      console.error('美化提示词失败:', error);
      alert('美化失败，请重试');
    }
  };

  const handleBeautifyCurrent = async () => {
    if (!formData.content.trim()) {
      alert('请先输入提示词内容');
      return;
    }

    try {
      const response = await fetch('/api/admin/prompts/beautify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: formData.content }),
      });

      if (!response.ok) {
        throw new Error('美化请求失败');
      }

      const result = await response.json();

      setFormData({
        ...formData,
        content: result.beautifiedContent
      });

      alert(`提示词美化完成！\n\n优化内容：\n${result.improvements.join('\n')}`);

    } catch (error) {
      console.error('美化提示词失败:', error);
      alert('美化失败，请重试');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'common',
      content: '',
      description: '',
      tags: '',
      isPublic: true
    });
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 这里应该显示成功提示
    } catch (err) {
      console.error('复制失败:', err);
    }
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
                <h1 className="text-2xl font-bold text-gray-900">提示词管理</h1>
                <p className="text-gray-600">创建和管理AI提示词模板</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="搜索提示词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建提示词
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>创建新提示词模板</DialogTitle>
                    <DialogDescription>
                      设计智能体的系统提示词和行为规范
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">模板名称</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="例如：共情回应模板"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">分类</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">描述</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="描述这个提示词模板的用途"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">标签</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        placeholder="用逗号分隔多个标签"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="content">提示词内容</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBeautifyCurrent}
                          disabled={!formData.content.trim()}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          AI美化
                        </Button>
                      </div>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        placeholder="输入提示词模板内容，使用 {name} 作为占位符..."
                        rows={12}
                        className="font-mono text-sm"
                      />
                      {formData.content && (
                        <div className="text-xs text-gray-500">
                          字符数: {formData.content.length} | 建议长度: 100-1000字符
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPublic"
                        checked={formData.isPublic}
                        onCheckedChange={(checked) => setFormData({...formData, isPublic: checked})}
                      />
                      <Label htmlFor="isPublic">公开模板</Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleCreate}>
                      <Save className="h-4 w-4 mr-2" />
                      创建模板
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">{prompt.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBeautifyPrompt(prompt.id)}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(prompt.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{prompt.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">{prompt.category}</Badge>
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4">
                  <p className="text-sm text-gray-600 line-clamp-3 font-mono">
                    {prompt.content.substring(0, 150)}...
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>使用次数: {prompt.usageCount}</span>
                  <Badge variant={prompt.isPublic ? "default" : "secondary"}>
                    {prompt.isPublic ? "公开" : "私有"}
                  </Badge>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(prompt)}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(prompt.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingPrompt && (
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑提示词模板</DialogTitle>
              <DialogDescription>
                修改提示词模板的内容和设置
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">模板名称</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">分类</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tags">标签</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-content">提示词内容</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBeautifyCurrent}
                    disabled={!formData.content.trim()}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI美化
                  </Button>
                </div>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={12}
                  className="font-mono text-sm"
                />
                {formData.content && (
                  <div className="text-xs text-gray-500">
                    字符数: {formData.content.length} | 建议长度: 100-1000字符
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({...formData, isPublic: checked})}
                />
                <Label htmlFor="edit-isPublic">公开模板</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingPrompt(null)}>
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
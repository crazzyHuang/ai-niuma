'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UsersRound, Plus, Edit, Trash2, Save, Users, Settings, Play } from 'lucide-react';
import Link from 'next/link';

interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  mode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: ChatGroupMember[];
  conversationCount: number;
}

interface ChatGroupMember {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  agentColor: string;
  order: number;
  priority: number;
}

interface Agent {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
}

const mockAgents: Agent[] = [
  { id: '1', name: '共情者小暖', code: 'EMPATHY', color: '#EF4444', description: '情感共鸣专家' },
  { id: '2', name: '建议者小智', code: 'PRACTICAL', color: '#3B82F6', description: '实用问题解决' },
  { id: '3', name: '创意者小思', code: 'CREATIVE', color: '#8B5CF6', description: '创新思路提供' },
  { id: '4', name: '分析师小明', code: 'ANALYST', color: '#F59E0B', description: '理性分析专家' },
  { id: '5', name: '关怀者小爱', code: 'FOLLOWUP', color: '#10B981', description: '温暖关怀总结' }
];

const mockGroups: ChatGroup[] = [
  {
    id: '1',
    name: '基础关怀群聊',
    description: '适合日常情感支持和一般咨询',
    mode: 'smart',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    conversationCount: 45,
    members: [
      { id: '1', agentId: '1', agentName: '共情者小暖', agentCode: 'EMPATHY', agentColor: '#EF4444', order: 1, priority: 8 },
      { id: '2', agentId: '2', agentName: '建议者小智', agentCode: 'PRACTICAL', agentColor: '#3B82F6', order: 2, priority: 6 },
      { id: '3', agentId: '5', agentName: '关怀者小爱', agentCode: 'FOLLOWUP', agentColor: '#10B981', order: 3, priority: 7 }
    ]
  },
  {
    id: '2',
    name: '创意工作坊',
    description: '专注于创意和创新的讨论',
    mode: 'natural',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    conversationCount: 23,
    members: [
      { id: '4', agentId: '3', agentName: '创意者小思', agentCode: 'CREATIVE', agentColor: '#8B5CF6', order: 1, priority: 9 },
      { id: '5', agentId: '2', agentName: '建议者小智', agentCode: 'PRACTICAL', agentColor: '#3B82F6', order: 2, priority: 7 },
      { id: '6', agentId: '4', agentName: '分析师小明', agentCode: 'ANALYST', agentColor: '#F59E0B', order: 3, priority: 6 }
    ]
  }
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<ChatGroup[]>(mockGroups);
  const [agents] = useState<Agent[]>(mockAgents);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'smart',
    isActive: true
  });

  const handleCreate = () => {
    const newGroup: ChatGroup = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      mode: formData.mode,
      isActive: formData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      conversationCount: 0,
      members: selectedAgents.map((agentId, index) => {
        const agent = agents.find(a => a.id === agentId)!;
        return {
          id: `${Date.now()}-${index}`,
          agentId,
          agentName: agent.name,
          agentCode: agent.code,
          agentColor: agent.color,
          order: index + 1,
          priority: 5
        };
      })
    };
    setGroups([...groups, newGroup]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = (group: ChatGroup) => {
    setEditingGroup(group);
    setSelectedAgents(group.members.map(m => m.agentId));
    setFormData({
      name: group.name,
      description: group.description || '',
      mode: group.mode,
      isActive: group.isActive
    });
  };

  const handleUpdate = () => {
    if (!editingGroup) return;
    setGroups(groups.map(group =>
      group.id === editingGroup.id
        ? {
            ...group,
            ...formData,
            members: selectedAgents.map((agentId, index) => {
              const agent = agents.find(a => a.id === agentId)!;
              return {
                id: `${Date.now()}-${index}`,
                agentId,
                agentName: agent.name,
                agentCode: agent.code,
                agentColor: agent.color,
                order: index + 1,
                priority: 5
              };
            }),
            updatedAt: new Date()
          }
        : group
    ));
    setEditingGroup(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setGroups(groups.filter(group => group.id !== id));
  };

  const handleTestGroup = (groupId: string) => {
    console.log('测试群聊:', groupId);
    // 这里可以跳转到测试页面或者打开测试对话
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mode: 'smart',
      isActive: true
    });
    setSelectedAgents([]);
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'smart':
        return '智能匹配，根据用户情绪和话题动态调整成员';
      case 'natural':
        return '随机顺序，打破固定模式，增加新鲜感';
      case 'fixed':
        return '固定顺序，按预设的发言顺序进行对话';
      default:
        return '未知模式';
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
                <h1 className="text-2xl font-bold text-gray-900">群聊配置管理</h1>
                <p className="text-gray-600">创建和管理智能体群聊组合</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  创建群聊
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>创建新群聊</DialogTitle>
                  <DialogDescription>
                    选择智能体成员，配置对话模式
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">群聊名称</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="例如：基础关怀群聊"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mode">对话模式</Label>
                      <Select value={formData.mode} onValueChange={(value) => setFormData({...formData, mode: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smart">智能匹配</SelectItem>
                          <SelectItem value="natural">随机顺序</SelectItem>
                          <SelectItem value="fixed">固定顺序</SelectItem>
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
                      placeholder="描述这个群聊的用途和特点"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>选择智能体成员</Label>
                    <p className="text-sm text-gray-600">已选择 {selectedAgents.length} 个智能体</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg">
                      {agents.map((agent) => (
                        <Card
                          key={agent.id}
                          className={`cursor-pointer transition-all ${
                            selectedAgents.includes(agent.id)
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => toggleAgentSelection(agent.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback style={{ backgroundColor: agent.color }}>
                                  {agent.name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{agent.name}</p>
                                <p className="text-xs text-gray-500">{agent.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <Label htmlFor="isActive">启用群聊</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={selectedAgents.length === 0}>
                    <Save className="h-4 w-4 mr-2" />
                    创建群聊
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UsersRound className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleTestGroup(group.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">{group.mode}</Badge>
                  <Badge variant={group.isActive ? "default" : "secondary"}>
                    {group.isActive ? "启用" : "禁用"}
                  </Badge>
                  <Badge variant="outline">
                    {group.members.length} 个成员
                  </Badge>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  {getModeDescription(group.mode)}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">群聊成员：</Label>
                  <div className="flex flex-wrap gap-2">
                    {group.members
                      .sort((a, b) => a.order - b.order)
                      .map((member) => (
                        <div key={member.id} className="flex items-center space-x-1 bg-gray-100 rounded px-2 py-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback style={{ backgroundColor: member.agentColor }} className="text-xs">
                              {member.agentName.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{member.agentName}</span>
                          <Badge variant="outline" className="text-xs">
                            {member.order}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>对话次数: {group.conversationCount}</span>
                    <span>创建时间: {group.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑群聊</DialogTitle>
              <DialogDescription>
                修改群聊配置和成员设置
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">群聊名称</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mode">对话模式</Label>
                  <Select value={formData.mode} onValueChange={(value) => setFormData({...formData, mode: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smart">智能匹配</SelectItem>
                      <SelectItem value="natural">随机顺序</SelectItem>
                      <SelectItem value="fixed">固定顺序</SelectItem>
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
                <Label>选择智能体成员</Label>
                <p className="text-sm text-gray-600">已选择 {selectedAgents.length} 个智能体</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg">
                  {agents.map((agent) => (
                    <Card
                      key={agent.id}
                      className={`cursor-pointer transition-all ${
                        selectedAgents.includes(agent.id)
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleAgentSelection(agent.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback style={{ backgroundColor: agent.color }}>
                              {agent.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{agent.name}</p>
                            <p className="text-xs text-gray-500">{agent.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="edit-isActive">启用群聊</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingGroup(null)}>
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
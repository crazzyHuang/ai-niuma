'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Sparkles, Users } from 'lucide-react';

export default function Home() {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateConversation = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          mode: 'empathy' // Default mode for now
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chat/${data.id}`);
      } else {
        console.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleCreateConversation();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">AI 朋友圈</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            与 AI 智能体展开温暖的对话，获得共情、建议和关怀支持
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">共情理解</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI 能够倾听您的感受，提供温暖的共情回应
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-lg">实用建议</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                基于您的具体情况，提供可行的解决方案
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <CardTitle className="text-lg">持续关怀</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                提供温暖的后续问候和长期支持
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Create Conversation */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>开始新对话</CardTitle>
            <CardDescription>
              描述您当前的心情或需要帮助的问题
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">对话主题</Label>
              <Input
                id="title"
                placeholder="例如：今天工作压力很大，想聊聊..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleCreateConversation}
              disabled={!title.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? '创建中...' : '开始对话'}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p className="text-sm">
            AI 朋友圈 - 您的贴心 AI 陪伴
          </p>
        </div>
      </div>
    </div>
  );
}

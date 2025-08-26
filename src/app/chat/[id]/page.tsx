'use client';

import { use, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MoreVertical, Send, Mic, FileText, Camera, MapPin, Menu } from 'lucide-react';

// 使用 lucide-react 图标组件

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface StreamChunk {
  type: 'user_message' | 'agent_start' | 'chunk' | 'agent_complete' | 'agent_error' | 'conversation_complete' | 'error';
  id?: string;
  content?: string;
  agent?: string;
  text?: string;
  messageId?: string;
  usage?: any;
  error?: string;
  fullContent?: string; // Add fullContent for completed messages
  timestamp: Date;
}

// Typing indicator component - 微信风格 shadcn颜色
function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 mt-1">
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<{ id: string; content: string; agent: string } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, streamingMessage]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Clear any existing streaming message
    setStreamingMessage(null);
    setCurrentAgent(null);

    // Optimistically add user message
    const userMessageObj: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessageObj]);

    try {
      console.log('📤 开始流式对话...');

      // Create EventSource for streaming
      const eventSource = new EventSource(
        `/api/conversations/${conversationId}/stream?message=${encodeURIComponent(userMessage)}`
      );

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: StreamChunk = JSON.parse(event.data);
          console.log('📨 收到流式数据:', data);

          switch (data.type) {
            case 'user_message':
              // User message already added
              break;

            case 'agent_start':
              setCurrentAgent(data.agent || null);
              setStreamingMessage({
                id: `streaming-${data.agent}-${Date.now()}`,
                content: '',
                agent: data.agent || '未知'
              });
              break;

            case 'chunk':
              setStreamingMessage(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  content: prev.content + (data.text || '')
                };
              });
              break;

            case 'agent_complete':
              // Add completed message to messages using fullContent from data
              if (data.fullContent && data.agent) {
                const completedMessage: Message = {
                  id: data.messageId || `completed-${data.agent}-${Date.now()}`,
                  role: 'ai',
                  content: data.fullContent,
                  timestamp: new Date(),
                  agent: data.agent
                };
                setMessages(prev => [...prev, completedMessage]);
              }
              setStreamingMessage(null);
              setCurrentAgent(null);
              break;

            case 'agent_error':
              setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'ai',
                content: `抱歉，${data.agent} 处理时出现错误: ${data.error}`,
                timestamp: new Date(),
                agent: data.agent || '系统'
              }]);
              setStreamingMessage(null);
              setCurrentAgent(null);
              break;

            case 'conversation_complete':
              setIsLoading(false);
              setCurrentAgent(null);
              setStreamingMessage(null);
              eventSource.close();
              break;

            case 'error':
              console.error('流式错误:', data.error);
              setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'ai',
                content: `处理消息时出现错误: ${data.error}`,
                timestamp: new Date()
              }]);
              setIsLoading(false);
              setCurrentAgent(null);
              setStreamingMessage(null);
              eventSource.close();
              break;
          }
        } catch (parseError) {
          console.error('解析流式数据错误:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'ai',
          content: '连接断开，请重试。',
          timestamp: new Date()
        }]);
        setIsLoading(false);
        setCurrentAgent(null);
        setStreamingMessage(null);
        eventSource.close();
      };

    } catch (error) {
      console.error('Error starting stream:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'ai',
        content: '发送消息失败，请重试。',
        timestamp: new Date()
      }]);
      setIsLoading(false);
      setCurrentAgent(null);
      setStreamingMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-background/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-background rounded-xl shadow-lg overflow-hidden border border-border">
        {/* 微信风格头部导航栏 - shadcn颜色 */}
        <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <button className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-medium">AI朋友圈</h1>
            {currentAgent && (
              <span className="text-xs text-muted-foreground animate-pulse">
                {currentAgent} 正在输入...
              </span>
            )}
          </div>
          <button className="p-1 text-muted-foreground hover:text-foreground">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

      {/* 微信风格消息区域 - shadcn颜色 */}
      <ScrollArea className="h-[600px] bg-background" ref={scrollAreaRef}>
        <div className="p-3 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-1 duration-300`}
            >
              <div className={`flex items-end space-x-2 max-w-[85%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                {/* 头像 - shadcn颜色 */}
                <Avatar className="h-8 w-8 mb-1">
                  <div className={`h-full w-full rounded-full flex items-center justify-center text-xs font-medium ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {message.role === 'user' ? '我' : '🤖'}
                  </div>
                </Avatar>

                {/* 消息气泡 - shadcn颜色 */}
                <div className={`relative px-3 py-2 max-w-full ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-l-lg rounded-tr-lg rounded-br-sm'
                    : 'bg-muted text-foreground rounded-r-lg rounded-tl-lg rounded-bl-sm'
                }`}>
                  {/* 微信风格气泡尾巴 */}
                  <div className={`absolute bottom-0 w-0 h-0 ${
                    message.role === 'user'
                      ? 'right-0 border-l-[8px] border-l-primary border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                      : 'left-0 border-r-[8px] border-r-muted border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                  }`}></div>

                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {/* 时间和代理标识 */}
                  <div className={`mt-1 flex items-center justify-between ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}>
                    <span className={`text-xs ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.agent && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                        message.role === 'user'
                          ? 'bg-primary/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.agent}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 流式消息 - 微信风格 */}
          {streamingMessage && (
            <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <div className="flex items-end space-x-2 max-w-[85%]">
                <Avatar className="h-8 w-8 mb-1 animate-in zoom-in-50 duration-300">
                  <div className="h-full w-full rounded-full bg-muted flex items-center justify-center text-xs">
                    🤖
                  </div>
                </Avatar>
                <div className="relative bg-muted text-foreground rounded-r-lg rounded-tl-lg rounded-bl-sm px-3 py-2 animate-in slide-in-from-left-2 duration-300">
                  <div className="absolute left-0 bottom-0 w-0 h-0 border-r-[8px] border-r-muted border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent"></div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingMessage.content}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <TypingIndicator />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground ml-2">
                      {streamingMessage.agent}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 加载指示器 - 微信风格 */}
          {isLoading && !streamingMessage && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2 max-w-[85%]">
                <Avatar className="h-8 w-8 mb-1">
                  <div className="h-full w-full rounded-full bg-muted flex items-center justify-center text-xs">
                    🤖
                  </div>
                </Avatar>
                <div className="relative bg-muted rounded-r-lg rounded-tl-lg rounded-bl-sm px-3 py-2">
                  <div className="absolute left-0 bottom-0 w-0 h-0 border-r-[8px] border-r-muted border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent"></div>
                  <TypingIndicator />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 微信风格输入框 - shadcn颜色 */}
      <div className="bg-muted/30 border-t border-border px-3 py-2">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息..."
              disabled={isLoading}
              className="bg-background border-border rounded-full px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {/* 语音输入按钮 */}
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            size="sm"
          >
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <TypingIndicator />
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <span>发送</span>
                <Send className="h-4 w-4" />
              </div>
            )}
          </Button>
        </form>

        {/* 工具栏 - 暂时隐藏，开发完成后放开 */}
        {/* <div className="flex items-center justify-between mt-1 text-muted-foreground">
          <div className="flex space-x-3">
            <button className="p-1 hover:text-foreground transition-colors">
              <FileText className="h-4 w-4" />
            </button>
            <button className="p-1 hover:text-foreground transition-colors">
              <Camera className="h-4 w-4" />
            </button>
            <button className="p-1 hover:text-foreground transition-colors">
              <MapPin className="h-4 w-4" />
            </button>
          </div>
          <button className="p-1 hover:text-foreground transition-colors">
            <Menu className="h-4 w-4" />
          </button>
        </div> */}
      </div>
      </div>
    </div>
  );
}
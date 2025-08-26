'use client';

import { use, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

// Typing indicator component
function TypingIndicator({ agent }: { agent: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-1 mt-2">
      <span className="text-xs text-green-600">正在输入{dots}</span>
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">AI 朋友圈对话</h1>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">对话ID: {conversationId}</p>
          {currentAgent && (
            <Badge variant="outline" className="animate-pulse">
              {currentAgent} 正在思考...
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-1 duration-300`}
            >
              <div className={`flex items-start space-x-2 max-w-[70%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <Avatar className="h-8 w-8">
                  <div className={`h-full w-full rounded-full flex items-center justify-center text-xs font-medium ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}>
                    {message.role === 'user' ? '我' : 'AI'}
                  </div>
                </Avatar>
                <div className={`rounded-lg p-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-xs ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.agent && (
                      <Badge variant="secondary" className="text-xs">
                        {message.agent}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <div className="flex items-start space-x-2 max-w-[70%]">
                <Avatar className="h-8 w-8 animate-in zoom-in-50 duration-300">
                  <div className={`h-full w-full rounded-full flex items-center justify-center text-xs font-medium ${
                    streamingMessage.agent === 'EMPATHY' ? 'bg-pink-500' :
                    streamingMessage.agent === 'PRACTICAL' ? 'bg-blue-500' :
                    streamingMessage.agent === 'CREATIVE' ? 'bg-purple-500' :
                    streamingMessage.agent === 'ANALYST' ? 'bg-orange-500' :
                    streamingMessage.agent === 'FOLLOWUP' ? 'bg-green-500' :
                    'bg-green-500'
                  } text-white`}>
                    {streamingMessage.agent.slice(0, 1)}
                  </div>
                </Avatar>
                <div className={`rounded-lg p-3 border shadow-sm animate-in slide-in-from-left-2 duration-300 ${
                  streamingMessage.agent === 'EMPATHY' ? 'bg-pink-50 border-pink-200' :
                  streamingMessage.agent === 'PRACTICAL' ? 'bg-blue-50 border-blue-200' :
                  streamingMessage.agent === 'CREATIVE' ? 'bg-purple-50 border-purple-200' :
                  streamingMessage.agent === 'ANALYST' ? 'bg-orange-50 border-orange-200' :
                  streamingMessage.agent === 'FOLLOWUP' ? 'bg-green-50 border-green-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{streamingMessage.content}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <TypingIndicator agent={streamingMessage.agent} />
                    <Badge variant="outline" className={`text-xs ${
                      streamingMessage.agent === 'EMPATHY' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                      streamingMessage.agent === 'PRACTICAL' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      streamingMessage.agent === 'CREATIVE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      streamingMessage.agent === 'ANALYST' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      streamingMessage.agent === 'FOLLOWUP' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {streamingMessage.agent}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator for conversation complete */}
          {isLoading && !streamingMessage && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[70%]">
                <Avatar className="h-8 w-8">
                  <div className="h-full w-full rounded-full flex items-center justify-center text-xs font-medium bg-gray-500 text-white">
                    AI
                  </div>
                </Avatar>
                <div className="rounded-lg p-3 bg-gray-100">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Form */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的消息..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            {isLoading ? 'AI思考中...' : '发送'}
          </Button>
        </form>
      </div>
    </div>
  );
}
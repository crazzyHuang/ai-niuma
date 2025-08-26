'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MessageCircle, Users, Search, ArrowLeft, ArrowRight, MoreVertical, Send, Mic, FileText, Camera, MapPin, Menu, ChevronRight, X } from 'lucide-react';

// 消息和流式数据接口
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
  fullContent?: string;
  timestamp: Date;
}

// Typing indicator component
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

// 聊天界面组件
function ChatInterface({
  conversationId,
  isSidebarCollapsed,
  onToggleSidebar,
  selectedConversation,
  onOpenGroupDrawer
}: {
  conversationId: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedConversation: Conversation | null;
  onOpenGroupDrawer: () => void;
}) {
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

  // Load messages when conversation changes
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          agent: msg.step
        })));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

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
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* 聊天头部 */}
      <div className="bg-background border-b border-border px-3 py-2 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          {isSidebarCollapsed ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-medium">对话</h1>
          {currentAgent && (
            <span className="text-xs text-muted-foreground animate-pulse">
              {currentAgent} 正在输入...
            </span>
          )}
        </div>
        <button
          onClick={onOpenGroupDrawer}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 min-h-0 bg-background" ref={scrollAreaRef}>
        <div className="p-2 space-y-2 h-full">
          {messages.length === 0 && !streamingMessage ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>开始您的对话...</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-1 duration-300`}
                >
                  <div className={`flex items-end space-x-2 max-w-[85%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {/* 头像 */}
                    <Avatar className="h-8 w-8 mb-1">
                      <div className={`h-full w-full rounded-full flex items-center justify-center text-xs font-medium ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.role === 'user' ? '我' : '🤖'}
                      </div>
                    </Avatar>

                    {/* 消息气泡 */}
                    <div className={`relative px-3 py-2 max-w-full ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-l-lg rounded-tr-lg rounded-br-sm'
                        : 'bg-muted text-foreground rounded-r-lg rounded-tl-lg rounded-bl-sm'
                    }`}>
                      {/* 气泡尾巴 */}
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

              {/* 流式消息 */}
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

              {/* 加载指示器 */}
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
            </>
          )}
        </div>
      </ScrollArea>

      {/* 输入框区域 */}
      <div className="bg-muted/30 border-t border-border px-2 py-2 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息..."
              disabled={isLoading}
              className="bg-background border-border rounded-full px-3 py-1 pr-8 text-sm focus:ring-2 focus:ring-primary focus:border-transparent h-8"
            />
            {/* 语音输入按钮 */}
            <button
              type="button"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <Mic className="h-3 w-3" />
            </button>
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-full px-3 py-1 text-sm font-medium transition-colors h-8"
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
      </div>
    </div>
  );
}

interface Conversation {
  id: string;
  title: string;
  mode: string;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    members: Array<{
      agent: {
        id: string;
        name: string;
        color: string;
        avatar?: string;
        description?: string;
        roleTag: string;
      };
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  color: string;
  roleTag: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false);

  // 加载对话列表
  useEffect(() => {
    loadConversations();
    loadAgents();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const createConversation = async () => {
    if (selectedAgents.length === 0) return;

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: selectedAgents.length === 1
            ? `与 ${agents.find(a => a.id === selectedAgents[0])?.name} 的对话`
            : `群聊: ${newGroupName || selectedAgents.map(id => agents.find(a => a.id === id)?.name).join(', ')}`,
          mode: 'smart',
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation.id);
        setIsCreateDialogOpen(false);
        setNewGroupName('');
        setSelectedAgents([]);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversationData = conversations.find(conv => conv.id === selectedConversation) || null;

  return (
    <div className="min-h-screen bg-background/50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[700px] bg-background rounded-xl shadow-lg overflow-hidden border border-border flex">
        {/* 左侧边栏 */}
        <div className={`${isSidebarCollapsed ? 'w-16' : 'w-72'} border-r border-border flex flex-col bg-muted/5 transition-all duration-300`}>
          {/* 头部 */}
          <div className="p-3 border-b border-border">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-3`}>
              {!isSidebarCollapsed && <h1 className="text-lg font-semibold">AI 朋友圈</h1>}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className={`${isSidebarCollapsed ? 'h-8 w-8 p-0' : 'h-8 w-8 p-0'}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>创建新对话</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">选择智能体</label>
                      <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {agents.map(agent => (
                          <Card
                            key={agent.id}
                            className={`cursor-pointer transition-colors ${
                              selectedAgents.includes(agent.id)
                                ? 'ring-2 ring-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => {
                              setSelectedAgents(prev =>
                                prev.includes(agent.id)
                                  ? prev.filter(id => id !== agent.id)
                                  : [...prev, agent.id]
                              );
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <div
                                    className="h-full w-full rounded-full flex items-center justify-center text-xs font-medium text-white"
                                    style={{ backgroundColor: agent.color }}
                                  >
                                    {agent.avatar || agent.name.slice(0, 1)}
                                  </div>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{agent.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {agent.description || agent.roleTag}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    {selectedAgents.length > 1 && (
                      <div>
                        <label className="text-sm font-medium">群聊名称（可选）</label>
                        <Input
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="输入群聊名称"
                          className="mt-1"
                        />
                      </div>
                    )}
                    <Button
                      onClick={createConversation}
                      disabled={selectedAgents.length === 0}
                      className="w-full"
                    >
                      创建对话
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* 搜索框 */}
            {!isSidebarCollapsed && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索对话..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>

          {/* 对话列表 */}
          <ScrollArea className="flex-1">
            <div className="p-0 space-y-0">
              {filteredConversations.map(conversation => (
                <div
                  key={conversation.id}
                  className={`cursor-pointer transition-colors border-b border-border/50 px-3 py-2 ${
                    selectedConversation === conversation.id
                      ? 'bg-primary/10 border-primary/20'
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation.id);
                  }}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                    <Avatar className={`${isSidebarCollapsed ? 'h-8 w-8' : 'h-6 w-6'}`}>
                      {conversation.group ? (
                        <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className={`${isSidebarCollapsed ? 'h-4 w-4' : 'h-3 w-3'} text-primary`} />
                        </div>
                      ) : (
                        <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                          <MessageCircle className={`${isSidebarCollapsed ? 'h-4 w-4' : 'h-3 w-3'} text-muted-foreground`} />
                        </div>
                      )}
                    </Avatar>
                    {!isSidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conversation.title}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(conversation.updatedAt).toLocaleDateString()}
                          </p>
                          {conversation.group && (
                            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                              {conversation.group.members.length} 成员
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧聊天内容区域 */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ChatInterface
              conversationId={selectedConversation}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              selectedConversation={selectedConversationData}
              onOpenGroupDrawer={() => setIsGroupDrawerOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">选择或创建对话</h2>
                <p className="text-muted-foreground max-w-md">
                  从左侧选择一个对话，或点击"新建"按钮创建新的对话
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 群成员抽屉栏 */}
        <div className={`fixed top-0 right-0 h-full w-80 bg-background border-l border-border shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isGroupDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* 抽屉头部 */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">群聊管理</h2>
            <button
              onClick={() => setIsGroupDrawerOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 抽屉内容 */}
          <div className="p-4 space-y-6 h-full overflow-y-auto">
            {selectedConversationData?.group && (
              <>
                {/* 群信息 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">群信息</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedConversationData.group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversationData.group.members.length} 成员
                      </p>
                    </div>
                  </div>
                </div>

                {/* 成员列表 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">成员</h3>
                  <div className="space-y-2">
                    {selectedConversationData.group.members.map((member, index) => (
                      <div key={member.agent.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <div
                            className="h-full w-full rounded-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: member.agent.color }}
                          >
                            {member.agent.avatar || member.agent.name.slice(0, 1)}
                          </div>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{member.agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.agent.description || member.agent.roleTag}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 群操作 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">操作</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      邀请成员
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      修改群名称
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive">
                      <X className="h-4 w-4 mr-2" />
                      退出群聊
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!selectedConversationData?.group && (
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>这不是一个群聊</p>
              </div>
            )}
          </div>
        </div>

        {/* 抽屉遮罩 */}
        {isGroupDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsGroupDrawerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
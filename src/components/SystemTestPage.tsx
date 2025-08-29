'use client';

/**
 * 🧪 系统测试页面
 * 
 * 发送测试消息，实时观察整个系统的内部流转过程
 * 显示详细的执行日志，便于调试和优化
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Brain, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Settings,
  Activity
} from 'lucide-react';

// ============= 类型定义 =============

interface SystemLog {
  id: string;
  timestamp: Date;
  phase: 'analysis' | 'execution' | 'aggregation' | 'system' | 'error';
  component: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

interface TestSession {
  id: string;
  userMessage: string;
  conversationId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'error';
  logs: SystemLog[];
}

// ============= 主组件 =============

export function SystemTestPage() {
  const [testMessage, setTestMessage] = useState('');
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到日志底部
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.logs]);

  // 开始测试
  const startTest = async () => {
    if (!testMessage.trim() || isRunning) return;

    setIsRunning(true);
    
    // 创建新的测试会话
    const sessionId = `test_${Date.now()}`;
    const conversationId = `conv_${Date.now()}`;
    
    const newSession: TestSession = {
      id: sessionId,
      userMessage: testMessage,
      conversationId,
      startTime: new Date(),
      status: 'running',
      logs: []
    };

    setCurrentSession(newSession);
    addLog('system', 'info', '🧪 开始系统测试', { userMessage: testMessage });

    try {
      // 1. 创建对话
      addLog('system', 'info', '📝 创建测试对话...', { conversationId });
      
      const createResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'empathy', // 使用简单模式便于观察
          title: `测试: ${testMessage.slice(0, 20)}...`
        })
      });

      if (!createResponse.ok) {
        throw new Error('创建对话失败');
      }

      const conversation = await createResponse.json();
      addLog('system', 'success', '✅ 对话创建成功', { conversationId: conversation.id });

      // 2. 建立SSE连接监听流程
      addLog('system', 'info', '🔗 建立实时监听连接...');
      
      // 使用encodeURIComponent确保消息内容正确编码
      const encodedMessage = encodeURIComponent(testMessage);
      const source = new EventSource(`/api/conversations/${conversation.id}/stream?message=${encodedMessage}`);
      setEventSource(source);

      // 监听各种事件
      source.addEventListener('user_message', (event) => {
        const data = JSON.parse(event.data);
        addLog('system', 'info', '👤 用户消息已保存', data);
      });

      source.addEventListener('step_started', (event) => {
        const data = JSON.parse(event.data);
        addLog('execution', 'info', `🎭 开始执行Agent: ${data.step}`, data);
      });

      source.addEventListener('ai_message_started', (event) => {
        const data = JSON.parse(event.data);
        addLog('execution', 'info', `🤖 ${data.agent} 开始生成回复...`, data);
      });

      source.addEventListener('ai_chunk', (event) => {
        const data = JSON.parse(event.data);
        addLog('execution', 'info', `📝 [${data.agent || 'Agent'}] 生成内容: "${data.text}"`, data);
      });

      source.addEventListener('ai_message_completed', (event) => {
        const data = JSON.parse(event.data);
        addLog('execution', 'success', `✅ ${data.agent} 完成回复`, {
          messageId: data.messageId,
          usage: data.usage,
          contentLength: data.content?.length
        });
      });

      source.addEventListener('step_failed', (event) => {
        const data = JSON.parse(event.data);
        addLog('execution', 'error', `❌ Agent ${data.step} 执行失败: ${data.error}`, data);
      });

      source.addEventListener('orchestration_completed', (event) => {
        const data = JSON.parse(event.data);
        addLog('system', 'success', '🎊 编排流程完成', data);
        completeTest();
      });

      source.addEventListener('orchestration_failed', (event) => {
        const data = JSON.parse(event.data);
        
        // 检查是否是rate limit错误，提供更有用的反馈
        if (data.error && (data.error.includes('请求频率过高') || data.error.includes('rate limit') || data.error.includes('429'))) {
          addLog('system', 'warning', '🚫 API请求频率限制', { 
            error: data.error,
            suggestion: '魔搭社区版API有频率限制，请等待2-3分钟后重试',
            solutions: [
              '等待2-3分钟后重新测试',
              '考虑配置其他AI提供商（如DeepSeek、OpenAI等）作为备选',
              '升级到魔搭付费版本以获得更高的API配额'
            ]
          });
        } else {
          addLog('system', 'error', `💥 编排流程失败: ${data.error}`, data);
        }
        
        failTest();
      });

      source.onerror = (error) => {
        addLog('system', 'error', '🔌 SSE连接错误', { error });
      };

      // 3. 开始分析和处理 (通过SSE流式API自动处理)
      addLog('analysis', 'info', '🧠 开始分析阶段 - 情感和意图识别...');
      addLog('system', 'info', '⏳ 等待系统处理中...', { 
        estimatedTime: '5-15秒',
        phases: ['情感分析', 'Agent选择', 'LLM调用', '结果聚合']
      });

    } catch (error) {
      console.error('测试启动失败:', error);
      addLog('system', 'error', `💥 测试启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsRunning(false);
    }
  };

  // 停止测试
  const stopTest = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    if (currentSession && currentSession.status === 'running') {
      addLog('system', 'warning', '⏹️ 测试被手动停止');
      setCurrentSession({
        ...currentSession,
        status: 'error',
        endTime: new Date()
      });
    }
    
    setIsRunning(false);
  };

  // 完成测试
  const completeTest = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    if (currentSession) {
      const endTime = new Date();
      const duration = endTime.getTime() - currentSession.startTime.getTime();
      
      addLog('system', 'success', `🏁 测试完成，总耗时: ${duration}ms`);
      
      setCurrentSession({
        ...currentSession,
        status: 'completed',
        endTime
      });
    }

    setIsRunning(false);
  };

  // 测试失败
  const failTest = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        status: 'error',
        endTime: new Date()
      });
    }

    setIsRunning(false);
  };

  // 添加日志
  const addLog = (phase: SystemLog['phase'], level: SystemLog['level'], message: string, details?: any, duration?: number) => {
    const log: SystemLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      phase,
      component: 'SystemTest',
      level,
      message,
      details,
      duration
    };

    setCurrentSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        logs: [...prev.logs, log]
      };
    });
  };

  // 重置测试
  const resetTest = () => {
    stopTest();
    setCurrentSession(null);
    setTestMessage('');
  };

  // 获取阶段图标
  const getPhaseIcon = (phase: SystemLog['phase']) => {
    switch (phase) {
      case 'analysis': return <Brain className="h-4 w-4" />;
      case 'execution': return <Zap className="h-4 w-4" />;
      case 'aggregation': return <Activity className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  // 获取级别颜色
  const getLevelColor = (level: SystemLog['level']) => {
    switch (level) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 页面头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              🧪 系统流转测试
            </h1>
            <p className="text-gray-600 mt-1">发送测试消息，实时观察系统内部处理流程</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 测试控制面板 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  测试控制台
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* 输入框 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    测试消息
                  </label>
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="输入要测试的消息..."
                    disabled={isRunning}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isRunning) {
                        startTest();
                      }
                    }}
                  />
                </div>

                {/* 控制按钮 */}
                <div className="flex gap-2">
                  <Button 
                    onClick={startTest} 
                    disabled={!testMessage.trim() || isRunning}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    开始测试
                  </Button>
                  
                  {isRunning && (
                    <Button 
                      onClick={stopTest} 
                      variant="destructive"
                      size="sm"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button 
                    onClick={resetTest} 
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {/* 会话信息 */}
                {currentSession && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-sm text-gray-700 mb-3">当前测试会话</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">状态:</span>
                        <Badge variant={
                          currentSession.status === 'completed' ? 'default' :
                          currentSession.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {currentSession.status === 'running' ? '执行中' :
                           currentSession.status === 'completed' ? '已完成' : '错误'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">开始时间:</span>
                        <span>{currentSession.startTime.toLocaleTimeString()}</span>
                      </div>
                      {currentSession.endTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">耗时:</span>
                          <span>{currentSession.endTime.getTime() - currentSession.startTime.getTime()}ms</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">日志条数:</span>
                        <span>{currentSession.logs.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 测试提示 */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-sm text-blue-800 mb-2">💡 测试建议</h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 尝试不同情感的消息（开心、难过、困惑）</li>
                    <li>• 观察AI分析和Agent选择逻辑</li>
                    <li>• 关注执行时间和错误处理</li>
                    <li>• 测试边界情况和异常输入</li>
                    <li>• ⚠️ 如遇频率限制，请等待2-3分钟后重试</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 实时日志面板 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  系统流转日志
                  {isRunning && (
                    <Badge variant="secondary" className="ml-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                      实时监控中
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                  {currentSession ? (
                    <div className="space-y-3">
                      {currentSession.logs.map((log, index) => (
                        <div key={log.id}>
                          <div className={`flex items-start gap-3 p-3 rounded-lg border ${getLevelColor(log.level)}`}>
                            <div className="flex-shrink-0 mt-0.5">
                              {getPhaseIcon(log.phase)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {log.phase}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {log.timestamp.toLocaleTimeString()}.{log.timestamp.getMilliseconds()}
                                  </span>
                                </div>
                                
                                {log.duration && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {log.duration}ms
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                {log.message}
                              </p>
                              
                              {log.details && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                    查看详情 ↓
                                  </summary>
                                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                          
                          {index < currentSession.logs.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>输入测试消息并点击"开始测试"来观察系统流转</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemTestPage;
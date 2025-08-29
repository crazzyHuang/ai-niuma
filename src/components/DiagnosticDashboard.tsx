'use client';

/**
 * 🔍 系统诊断控制面板
 * 
 * 实时监控对话流程和系统内部运作状态
 * 提供完整的调试和性能分析界面
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Brain, 
  MessageSquare,
  Search,
  RefreshCw,
  Settings,
  Eye,
  BarChart3,
  Timer
} from 'lucide-react';

// ============= 类型定义 =============

interface SystemDiagnostic {
  timestamp: Date;
  conversationId: string;
  userMessage: string;
  
  analysisPhase: {
    aiAnalysis?: any;
    sceneAnalysis?: any;
    executionPlan?: any;
    analysisTime: number;
  };
  
  executionPhase: {
    selectedAgents: string[];
    executionStrategy: string;
    phaseResults: PhaseExecutionResult[];
    totalExecutionTime: number;
  };
  
  aggregationPhase: {
    strategy: string;
    qualityScore: number;
    finalResponses: any[];
    aggregationTime: number;
  };
  
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    agentHealth: { [agentId: string]: any };
    routingStats: any;
    cacheStats: any;
  };
  
  errors: DiagnosticError[];
  warnings: DiagnosticWarning[];
}

interface PhaseExecutionResult {
  phaseName: string;
  executionMode: string;
  agents: {
    agentId: string;
    success: boolean;
    executionTime: number;
    result?: any;
    error?: string;
  }[];
  totalTime: number;
}

interface DiagnosticError {
  timestamp: Date;
  component: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  metadata?: any;
}

interface DiagnosticWarning {
  timestamp: Date;
  component: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface LiveMetrics {
  activeConversations: number;
  totalAgents: number;
  healthyAgents: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdate: Date;
}

// ============= 主组件 =============

export function DiagnosticDashboard() {
  // 状态管理
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostic[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [logBuffer, setLogBuffer] = useState<DiagnosticError[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<SystemDiagnostic | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 从API获取诊断数据
  const fetchDiagnosticsData = useCallback(async () => {
    try {
      const [diagnosticsRes, metricsRes, logsRes, healthRes] = await Promise.all([
        fetch('/api/diagnostics/data'),
        fetch('/api/diagnostics/metrics'),
        fetch('/api/diagnostics/logs'),
        fetch('/api/diagnostics/health')
      ]);

      if (diagnosticsRes.ok) {
        const data = await diagnosticsRes.json();
        setDiagnostics(data);
      }

      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        setLiveMetrics(metrics);
      }

      if (logsRes.ok) {
        const logs = await logsRes.json();
        setLogBuffer(logs);
      }

      if (healthRes.ok) {
        const health = await healthRes.json();
        setSystemHealth(health);
      }
    } catch (error) {
      console.error('获取诊断数据失败:', error);
    }
  }, []);

  // 启动实时流监听
  const startRealTimeStream = useCallback(() => {
    if (isStreaming) return;

    setIsStreaming(true);
    const eventSource = new EventSource('/api/diagnostics/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.event) {
          case 'diagnostic_update':
            setDiagnostics(prev => [data.data, ...prev].slice(0, 100));
            break;
          case 'metrics_update':
            setLiveMetrics(data.data);
            break;
          case 'log_update':
            setLogBuffer(prev => [data.data, ...prev].slice(0, 500));
            break;
          case 'health_update':
            setSystemHealth(data.data);
            break;
        }
      } catch (error) {
        console.error('处理实时数据失败:', error);
      }
    };

    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [isStreaming]);

  // 初始化和自动刷新
  useEffect(() => {
    fetchDiagnosticsData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDiagnosticsData, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchDiagnosticsData, autoRefresh]);

  // 过滤诊断数据
  const filteredDiagnostics = diagnostics.filter(d => 
    !searchFilter || 
    d.conversationId.includes(searchFilter) ||
    d.userMessage.toLowerCase().includes(searchFilter.toLowerCase()) ||
    d.executionPhase.selectedAgents.some(agent => 
      agent.toLowerCase().includes(searchFilter.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 页面头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600" />
              系统诊断控制台
            </h1>
            <p className="text-gray-600 mt-1">实时监控AI Agent Bus系统运行状态</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              自动刷新
            </Button>
            
            <Button
              variant={isStreaming ? "destructive" : "default"}
              size="sm"
              onClick={isStreaming ? () => setIsStreaming(false) : startRealTimeStream}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isStreaming ? '停止' : '开始'}实时监控
            </Button>
          </div>
        </div>

        {/* 实时指标概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="活跃对话"
            value={liveMetrics?.activeConversations ?? 0}
            icon={<MessageSquare className="h-5 w-5" />}
            trend="stable"
          />
          <MetricCard
            title="健康Agent"
            value={`${liveMetrics?.healthyAgents ?? 0}/${liveMetrics?.totalAgents ?? 0}`}
            icon={<CheckCircle className="h-5 w-5" />}
            trend="positive"
          />
          <MetricCard
            title="平均响应时间"
            value={`${liveMetrics?.averageResponseTime?.toFixed(0) ?? 0}ms`}
            icon={<Timer className="h-5 w-5" />}
            trend="stable"
          />
          <MetricCard
            title="缓存命中率"
            value={`${((liveMetrics?.cacheHitRate ?? 0) * 100).toFixed(1)}%`}
            icon={<Zap className="h-5 w-5" />}
            trend="positive"
          />
        </div>

        {/* 系统健康状态 */}
        {systemHealth && (
          <SystemHealthCard health={systemHealth} />
        )}

        {/* 主要内容区域 */}
        <Tabs defaultValue="diagnostics" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="grid w-fit grid-cols-4">
              <TabsTrigger value="diagnostics">对话诊断</TabsTrigger>
              <TabsTrigger value="logs">系统日志</TabsTrigger>
              <TabsTrigger value="performance">性能分析</TabsTrigger>
              <TabsTrigger value="agents">Agent状态</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索对话ID、消息内容或Agent..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </div>

          {/* 对话诊断标签页 */}
          <TabsContent value="diagnostics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 对话列表 */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">最近对话</CardTitle>
                    <CardDescription>
                      共 {filteredDiagnostics.length} 个对话记录
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {filteredDiagnostics.map((diagnostic, index) => (
                          <ConversationItem
                            key={`${diagnostic.conversationId}_${diagnostic.timestamp}`}
                            diagnostic={diagnostic}
                            isSelected={selectedDiagnostic === diagnostic}
                            onClick={() => setSelectedDiagnostic(diagnostic)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* 详细信息面板 */}
              <div className="lg:col-span-2">
                {selectedDiagnostic ? (
                  <DiagnosticDetailPanel diagnostic={selectedDiagnostic} />
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">选择一个对话查看详细诊断信息</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 系统日志标签页 */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>系统日志</CardTitle>
                <CardDescription>实时系统日志和错误信息</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {logBuffer.map((log, index) => (
                      <LogEntry key={index} log={log} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 性能分析标签页 */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>执行时间分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceChart diagnostics={filteredDiagnostics} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>内存使用情况</CardTitle>
                </CardHeader>
                <CardContent>
                  <MemoryChart diagnostics={filteredDiagnostics} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Agent状态标签页 */}
          <TabsContent value="agents">
            <AgentStatusGrid systemHealth={systemHealth} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============= 子组件 =============

function MetricCard({ 
  title, 
  value, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend: 'positive' | 'negative' | 'stable' 
}) {
  const trendColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    stable: 'text-blue-600'
  }[trend];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`${trendColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemHealthCard({ health }: { health: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Alert className={getStatusColor(health.overall)}>
      <div className="flex items-center gap-2">
        {getStatusIcon(health.overall)}
        <AlertDescription>
          <div className="flex justify-between items-center">
            <span className="font-semibold">
              系统状态: {health.overall === 'healthy' ? '正常' : health.overall === 'warning' ? '警告' : '严重'}
            </span>
            {health.recommendations && health.recommendations.length > 0 && (
              <div className="text-sm">
                建议: {health.recommendations.join(', ')}
              </div>
            )}
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
}

function ConversationItem({ 
  diagnostic, 
  isSelected, 
  onClick 
}: { 
  diagnostic: SystemDiagnostic; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  const hasErrors = diagnostic.errors.length > 0;
  const hasWarnings = diagnostic.warnings.length > 0;
  
  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="font-medium text-sm text-gray-900 truncate">
          {diagnostic.conversationId.slice(-8)}
        </p>
        <div className="flex gap-1">
          {hasErrors && <XCircle className="h-4 w-4 text-red-500" />}
          {hasWarnings && <AlertCircle className="h-4 w-4 text-yellow-500" />}
        </div>
      </div>
      
      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
        {diagnostic.userMessage}
      </p>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{new Date(diagnostic.timestamp).toLocaleTimeString()}</span>
        <Badge variant="outline" className="text-xs">
          {diagnostic.executionPhase.selectedAgents.length} Agents
        </Badge>
      </div>
    </div>
  );
}

function DiagnosticDetailPanel({ diagnostic }: { diagnostic: SystemDiagnostic }) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            对话详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">对话ID</label>
              <p className="text-sm text-gray-900">{diagnostic.conversationId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">用户消息</label>
              <p className="text-sm text-gray-900">{diagnostic.userMessage}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">时间</label>
              <p className="text-sm text-gray-900">
                {new Date(diagnostic.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 执行阶段 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            执行阶段分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">执行策略</label>
                <p className="text-sm text-gray-900">{diagnostic.executionPhase.executionStrategy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">总执行时间</label>
                <p className="text-sm text-gray-900">{diagnostic.executionPhase.totalExecutionTime}ms</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">参与的Agents</label>
              <div className="flex flex-wrap gap-2">
                {diagnostic.executionPhase.selectedAgents.map((agent, index) => (
                  <Badge key={index} variant="secondary">
                    {agent}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 阶段执行结果 */}
            {diagnostic.executionPhase.phaseResults.map((phase, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{phase.phaseName}</h4>
                  <Badge variant="outline">{phase.executionMode}</Badge>
                </div>
                
                <div className="space-y-2">
                  {phase.agents.map((agent, agentIndex) => (
                    <div key={agentIndex} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        {agent.success ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />
                        }
                        {agent.agentId}
                      </span>
                      <span className="text-gray-600">{agent.executionTime}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 聚合结果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            聚合结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">聚合策略</label>
                <p className="text-sm text-gray-900">{diagnostic.aggregationPhase.strategy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">质量分数</label>
                <div className="flex items-center gap-2">
                  <Progress value={diagnostic.aggregationPhase.qualityScore * 100} className="flex-1" />
                  <span className="text-sm font-medium">
                    {(diagnostic.aggregationPhase.qualityScore * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">最终响应数量</label>
              <p className="text-sm text-gray-900">{diagnostic.aggregationPhase.finalResponses.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误和警告 */}
      {(diagnostic.errors.length > 0 || diagnostic.warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              问题报告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diagnostic.errors.map((error, index) => (
                <Alert key={`error-${index}`} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">[{error.component}] {error.message}</div>
                    <div className="text-xs mt-1">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
              
              {diagnostic.warnings.map((warning, index) => (
                <Alert key={`warning-${index}`}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">[{warning.component}] {warning.message}</div>
                    <div className="text-xs mt-1 text-gray-600">
                      建议: {warning.suggestion} | 影响级别: {warning.impact}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LogEntry({ log }: { log: DiagnosticError }) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 border-l-4 ${getLevelColor(log.level)}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {log.component}
            </Badge>
            <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warning' ? 'secondary' : 'default'}>
              {log.level.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-gray-900">{log.message}</p>
          {log.metadata && (
            <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
        <time className="text-xs text-gray-500 ml-4">
          {new Date(log.timestamp).toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}

function PerformanceChart({ diagnostics }: { diagnostics: SystemDiagnostic[] }) {
  const chartData = diagnostics.slice(0, 20).reverse().map((d, index) => ({
    index,
    analysisTime: d.analysisPhase.analysisTime,
    executionTime: d.executionPhase.totalExecutionTime,
    aggregationTime: d.aggregationPhase.aggregationTime
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">最近20次对话的执行时间分析</p>
      {/* 这里可以集成图表库如recharts */}
      <div className="grid gap-2">
        {chartData.map((item, index) => (
          <div key={index} className="text-xs">
            <div className="flex justify-between mb-1">
              <span>对话 #{item.index + 1}</span>
              <span>{item.executionTime}ms</span>
            </div>
            <Progress value={Math.min(item.executionTime / 5000 * 100, 100)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryChart({ diagnostics }: { diagnostics: SystemDiagnostic[] }) {
  const latestMemory = diagnostics[0]?.performance.memoryUsage;
  
  if (!latestMemory) {
    return <p className="text-sm text-gray-500">暂无内存数据</p>;
  }

  const memoryItems = [
    { name: 'RSS', value: latestMemory.rss, color: 'bg-blue-500' },
    { name: 'Heap Used', value: latestMemory.heapUsed, color: 'bg-green-500' },
    { name: 'Heap Total', value: latestMemory.heapTotal, color: 'bg-yellow-500' },
    { name: 'External', value: latestMemory.external, color: 'bg-purple-500' }
  ];

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {memoryItems.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-2">
            <span>{item.name}</span>
            <span>{formatBytes(item.value)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${item.color}`}
              style={{ width: `${Math.min(item.value / latestMemory.heapTotal * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentStatusGrid({ systemHealth }: { systemHealth: any }) {
  if (!systemHealth?.components) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-gray-500">暂无Agent状态数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(systemHealth.components).map(([componentName, status]: [string, any]) => (
        <Card key={componentName}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {componentName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {status.status === 'healthy' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : status.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">
                  {status.status === 'healthy' ? '正常' : status.status}
                </span>
              </div>

              {status.averageResponseTime && (
                <div className="text-sm">
                  <span className="text-gray-600">平均响应:</span>
                  <span className="ml-2">{status.averageResponseTime.toFixed(0)}ms</span>
                </div>
              )}

              {status.error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    {status.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DiagnosticDashboard;
/**
 * 实时诊断数据流API路由
 * 
 * 提供Server-Sent Events流式传输实时诊断数据
 */

import { NextRequest } from 'next/server';
import diagnosticService from '@/lib/diagnostic-service';

export async function GET(request: NextRequest) {
  // 设置SSE响应头
  const responseInit = {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  };

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // SSE helper函数
  const sendEvent = async (event: string, data: any) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // 订阅诊断服务的实时更新
  const unsubscribe = diagnosticService.subscribe(async (update) => {
    try {
      const { event, data } = update;
      
      switch (event) {
        case 'analysis_phase':
          await sendEvent('diagnostic_update', {
            event: 'analysis_phase',
            data
          });
          break;
          
        case 'execution_phase':
          await sendEvent('diagnostic_update', {
            event: 'execution_phase', 
            data
          });
          break;
          
        case 'aggregation_phase':
          await sendEvent('diagnostic_update', {
            event: 'aggregation_phase',
            data
          });
          break;
          
        case 'diagnostic_complete':
          await sendEvent('diagnostic_update', {
            event: 'diagnostic_complete',
            data
          });
          break;
          
        default:
          await sendEvent('log_update', {
            event: 'log_update',
            data: update
          });
      }
    } catch (error) {
      console.error('发送SSE事件失败:', error);
    }
  });

  // 发送初始心跳
  await sendEvent('connected', { timestamp: new Date().toISOString() });

  // 定期发送心跳和更新指标
  const heartbeatInterval = setInterval(async () => {
    try {
      // 发送实时指标更新
      const liveMetrics = diagnosticService.getLiveMetrics();
      await sendEvent('metrics_update', liveMetrics);

      // 发送系统健康状态更新
      try {
        const systemHealth = await diagnosticService.getSystemHealth();
        await sendEvent('health_update', systemHealth);
      } catch (error) {
        console.warn('获取系统健康状态失败:', error);
      }

      // 发送心跳
      await sendEvent('heartbeat', { timestamp: new Date().toISOString() });
      
    } catch (error) {
      console.error('发送心跳失败:', error);
      // 如果写入失败，说明连接已断开
      clearInterval(heartbeatInterval);
      unsubscribe();
    }
  }, 5000); // 每5秒发送一次心跳

  // 处理客户端断开连接
  request.signal?.addEventListener('abort', () => {
    console.log('客户端断开SSE连接');
    clearInterval(heartbeatInterval);
    unsubscribe();
    writer.close();
  });

  // 返回流式响应
  return new Response(readable, responseInit);
}

// 处理CORS预检请求
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
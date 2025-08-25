import { NextRequest, NextResponse } from 'next/server';
import { AgentConfigManager } from '@/lib/agent-config-manager';

export async function POST(request: NextRequest) {
  try {
    const currentMode = AgentConfigManager.isSingleProviderMode();
    const newMode = !currentMode;
    
    AgentConfigManager.setSingleProviderMode(newMode);

    return NextResponse.json({
      success: true,
      mode: newMode ? 'single-provider' : 'multi-provider',
      message: `已切换到${newMode ? '单一厂家' : '多厂家'}模式`,
    });

  } catch (error) {
    console.error('Failed to toggle mode:', error);
    return NextResponse.json(
      { 
        error: 'Failed to toggle mode',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

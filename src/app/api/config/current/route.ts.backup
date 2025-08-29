import { NextRequest, NextResponse } from 'next/server';
import { AgentConfigManager } from '@/lib/agent-config-manager';

export async function GET(request: NextRequest) {
  try {
    const isSingleProvider = AgentConfigManager.isSingleProviderMode();
    const currentProvider = AgentConfigManager.getCurrentProvider();
    const agents = AgentConfigManager.getAllAgents();
    const flows = AgentConfigManager.getAllFlows();

    return NextResponse.json({
      isSingleProvider,
      currentProvider,
      agents: agents.map(agent => ({
        roleTag: agent.roleTag,
        name: agent.name,
        order: agent.order,
      })),
      flows: flows.map(flow => ({
        name: flow.name,
        mode: flow.mode,
        steps: flow.steps,
      })),
    });

  } catch (error) {
    console.error('Failed to get current config:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

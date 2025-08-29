import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * AI美化提示词API
 */
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '提示词内容不能为空' },
        { status: 400 }
      );
    }

    // 这里应该调用真实的AI API来美化提示词
    // 现在用模拟的优化逻辑

    const beautifiedContent = beautifyPrompt(content);

    return NextResponse.json({
      success: true,
      originalContent: content,
      beautifiedContent,
      improvements: [
        '优化了语言表达',
        '增强了指令的明确性',
        '改善了结构组织',
        '增加了示例引导'
      ]
    });

  } catch (error) {
    console.error('美化提示词错误:', error);
    return NextResponse.json(
      { error: '美化失败，请重试' },
      { status: 500 }
    );
  }
}

/**
 * 模拟AI美化提示词的逻辑
 */
function beautifyPrompt(content: string): string {
  // 基础的美化规则
  let beautified = content;

  // 1. 统一标点符号
  beautified = beautified.replace(/，/g, '，').replace(/。/g, '。');
  beautified = beautified.replace(/：/g, '：').replace(/；/g, '；');

  // 2. 优化段落结构
  beautified = beautified.replace(/([。！？])\s*([A-Z\u4e00-\u9fa5])/g, '$1\n\n$2');

  // 3. 增强指令明确性
  beautified = beautified.replace(/你应该/g, '请您务必');
  beautified = beautified.replace(/你需要/g, '您需要');
  beautified = beautified.replace(/你的任务/g, '您的核心任务');

  // 4. 添加结构化元素
  if (!beautified.includes('核心任务')) {
    beautified = beautified.replace(/任务：/g, '## 核心任务\n');
  }

  if (!beautified.includes('具体要求')) {
    beautified = beautified.replace(/要求：/g, '## 具体要求\n');
  }

  // 5. 优化语气
  beautified = beautified.replace(/不要/g, '切勿');
  beautified = beautified.replace(/必须/g, '务必');
  beautified = beautified.replace(/应该/g, '应当');

  // 6. 添加示例引导
  if (!beautified.includes('例如') && !beautified.includes('比如')) {
    beautified += '\n\n## 示例表现\n请根据上述要求，展现出色的执行能力。';
  }

  return beautified;
}
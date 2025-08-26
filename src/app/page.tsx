'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 自动重定向到聊天页面
    router.push('/chat');
  }, [router]);

  return null; // 不渲染任何内容，直接重定向
}

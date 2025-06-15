'use server';

import { cookies } from 'next/headers';
import type { UIMessage } from '@/components/chat';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  // 간단한 제목 생성 -> 추후 llm 이용해서 요약 등 하는 방식으로 변경 고려
  const content = message.content || message.parts?.[0]?.text || 'New Chat';
  const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
  return title;
}

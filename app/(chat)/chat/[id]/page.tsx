import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { Attachment, UIMessage } from 'ai';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// 백엔드에서 채팅 정보 가져오기
async function getChatFromBackend(chatId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const messages = await response.json();
    return { messages, exists: true };
  } catch (error) {
    console.error('Error fetching chat from backend:', error);
    return null;
  }
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  // 백엔드에서 채팅 메시지 가져오기 (채팅이 존재하지 않으면 빈 배열로 시작)
  const chatData = await getChatFromBackend(id);
  const messagesFromBackend = chatData?.messages || [];

  function convertToUIMessages(messages: Array<any>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      content: '',
      createdAt: new Date(message.createdAt),
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  const initialMessages = convertToUIMessages(messagesFromBackend);
  const chatModel = chatModelFromCookie?.value || DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        id={id}
        initialMessages={initialMessages}
        initialChatModel={chatModel}
        isReadonly={false} // Visibility 기능 제거로 현재는 붋필요. 추후 확장 가능성 있으니 남겨둠
        session={session}
        autoResume={true}
      />
      <DataStreamHandler id={id} />
    </>
  );
}

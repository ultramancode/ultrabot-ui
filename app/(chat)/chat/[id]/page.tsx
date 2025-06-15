'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Chat, type UIMessage } from '@/components/chat';
import { DEFAULT_CHAT_MODEL, API_BASE_URL } from '@/lib/constants';
import AuthService, { type User } from '@/lib/auth';

// 백엔드에서 채팅 정보 가져오기
async function getChatFromBackend(chatId: string, authHeaders: Record<string, string>) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
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

function convertToUIMessages(messages: Array<any>): Array<UIMessage> {
  return messages.map((message) => ({
    id: message.id,
    parts: message.parts || [{ type: 'text', text: message.content || '' }],
    role: message.role as UIMessage['role'],
    content: message.content || '',
    experimental_attachments: message.attachments ?? [],
  }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialMessages, setInitialMessages] = useState<Array<UIMessage>>([]);

  useEffect(() => {
    const checkAuthAndLoadChat = async () => {
      const currentUser = AuthService.getUser();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // 토큰 유효성 검증
      const isValid = await AuthService.verifyToken();
      if (!isValid) {
        AuthService.clearAuth();
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // 채팅 메시지 로드
      const authHeaders = AuthService.getAuthHeaders();
      const chatData = await getChatFromBackend(resolvedParams.id, authHeaders);
      const messagesFromBackend = chatData?.messages || [];
      const convertedMessages = convertToUIMessages(messagesFromBackend);
      
      setInitialMessages(convertedMessages);
      setIsLoading(false);
    };

    checkAuthAndLoadChat();
  }, [router, resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center">
        <div className="text-center">
                      <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중
  }

  // URL에서 모델 선택 확인
  const modelFromUrl = searchParams.get('model');
  const selectedModel = modelFromUrl || DEFAULT_CHAT_MODEL;

  return (
    <Chat
      id={resolvedParams.id}
      initialMessages={initialMessages}
      selectedModelId={selectedModel}
      isReadonly={false}
      user={user}
    />
  );
}

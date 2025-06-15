'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Chat } from '@/components/chat';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_CHAT_MODEL, API_BASE_URL } from '@/lib/constants';
import AuthService, { type User } from '@/lib/auth';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadRecentChat = async () => {
      const currentUser = AuthService.getUser();
      
      if (!currentUser) {
        // 인증되지 않은 사용자는 로그인 페이지로
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

      // 최근 채팅 조회
      try {
        const token = AuthService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/history?userId=${currentUser.id}&limit=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.chats && data.chats.length > 0) {
            // 최근 채팅이 있으면 해당 채팅으로 리다이렉트
            const recentChatId = data.chats[0].id;
            router.push(`/chat/${recentChatId}`);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent chats:', error);
      }

      // 최근 채팅이 없으면 새로운 채팅 ID 생성
      setChatId(generateUUID());
      setIsLoading(false);
    };

    checkAuthAndLoadRecentChat();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !chatId) {
    return null; // 리다이렉트 중
  }
  
  // URL에서 모델 선택 확인
  const modelFromUrl = searchParams.get('model');
  const selectedModel = modelFromUrl || DEFAULT_CHAT_MODEL;

  return (
    <Chat
      key={chatId}
      id={chatId}
      initialMessages={[]}
      selectedModelId={selectedModel}
      isReadonly={false}
      user={user}
    />
  );
}

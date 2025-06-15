'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { ChatHeader } from './chat-header';
import { generateUUID } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { toast } from './toast';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/constants';
import AuthService, { type User } from '@/lib/auth';

// UI 메시지 타입 정의
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts: Array<{
    type: 'text';
    text: string;
  }>;
  experimental_attachments?: Array<ChatAttachment>;
}

// 첨부파일 타입 정의
export interface ChatAttachment {
  url: string;
  name?: string;
  contentType?: string;
}

// 버튼 메시지 타입
interface PendingButtonMessage {
  message: string;
  buttons: Array<{
    label: string;
    value: string;
  }>;
}

export function Chat({
  id,
  initialMessages,
  selectedModelId,
  user,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedModelId: string;
  user: User;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [messages, setMessages] = useState<Array<UIMessage>>(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming' | 'error'>('ready');
  const [attachments, setAttachments] = useState<Array<ChatAttachment>>([]);
  const [pendingButtonMessage, setPendingButtonMessage] = useState<PendingButtonMessage | null>(null);

  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  const handleSendMessage = useCallback(async (messageContent: string, actionResponse?: string) => {
    if (!messageContent.trim() && !actionResponse) return;

    setStatus('streaming');
    
    // 로딩 메시지 추가 (버튼 클릭이 아닌 경우에만)
    let loadingMessageId: string | null = null;
    if (!actionResponse) {
      const loadingMessage: UIMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: '생각 중...',
        parts: [{ type: 'text', text: '생각 중...' }],
      };
      loadingMessageId = loadingMessage.id;
      setMessages(prev => [...prev, loadingMessage]);
    }
    
    try {
      const requestBody: any = { 
        message: messageContent,
        chat_id: id,
        user_id: user?.id || "guest",
        selected_model: selectedModelId  // 선택된 모델 전달
      };
      if (actionResponse) {
        requestBody.action_response = actionResponse;
      }

      // 인증 헤더 추가
      const authHeaders = AuthService.getAuthHeaders();
      
      console.log('Chat request - Auth headers:', authHeaders);
      console.log('Chat request - User ID:', user?.id);
      console.log('Chat request - Request body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Chat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat request failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 응답 메시지 생성
      const assistantMessage: UIMessage = {
        id: loadingMessageId || generateUUID(),
        role: 'assistant',
        content: data.response || '',
        parts: [{ type: 'text', text: data.response || '' }],
      };

      // 버튼이 있는 경우 상태에 저장
      if (data.buttons && data.buttons.length > 0) {
        setPendingButtonMessage({
          message: data.response,
          buttons: data.buttons
        });
      } else {
        setPendingButtonMessage(null);
      }

      if (loadingMessageId) {
        // 로딩 메시지를 실제 응답으로 교체
        setMessages(prev => 
          prev.map(msg => 
            msg.id === loadingMessageId ? assistantMessage : msg
          )
        );
      } else {
        // 버튼 클릭 응답인 경우 새 메시지 추가
        setMessages(prev => [...prev, assistantMessage]);
      }
      
      // 사이드바 히스토리 업데이트 (강제 새로고침)
      await mutate(
        (key) => 
          typeof key === 'string' && 
          key.includes('/chat/history') && 
          key.includes(`userId=${user.id}`),
        undefined,
        { revalidate: true }
      );
      
      // 추가적으로 사이드바 새로고침 이벤트 트리거
      window.dispatchEvent(new CustomEvent('refreshSidebar'));
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      setStatus('error');
      
      if (loadingMessageId) {
        // 로딩 메시지를 에러 메시지로 교체
        const errorMessage: UIMessage = {
          id: loadingMessageId,
          role: 'assistant',
          content: '죄송합니다. 오류가 발생했습니다.',
          parts: [{ type: 'text', text: '죄송합니다. 오류가 발생했습니다.' }],
        };
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === loadingMessageId ? errorMessage : msg
          )
        );
      }
      
      toast({
        type: 'error',
        description: error.message || 'Failed to send message',
      });
    } finally {
      if (status !== 'error') {
        setStatus('ready');
      }
    }
  }, [user, selectedModelId, id, mutate]);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      const queryMessage: UIMessage = {
        id: generateUUID(),
        role: 'user',
        content: query,
        parts: [{ type: 'text', text: query }],
      };
      
      setMessages(prev => [...prev, queryMessage]);
      handleSendMessage(query);
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, hasAppendedQuery, id]);

  // 버튼 클릭 핸들러
  const handleButtonClick = async (buttonValue: string) => {
    if (!pendingButtonMessage) return;

    // 사용자가 버튼을 클릭했다는 메시지 추가
    const userMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      content: buttonValue === 'yes' ? '예' : '아니오',
      parts: [{ type: 'text', text: buttonValue === 'yes' ? '예' : '아니오' }],
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 백엔드에 버튼 응답 전송
    await handleSendMessage(pendingButtonMessage.message, buttonValue);
    setPendingButtonMessage(null);
  };

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    
    if (!input.trim() || status !== 'ready') return;

    const userMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      content: input,
      parts: [{ type: 'text', text: input }],
      experimental_attachments: attachments,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setAttachments([]);
    
    await handleSendMessage(currentInput);
  };

  const append = async (message: any): Promise<string | null | undefined> => {
    const userMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      content: message.content,
      parts: [{ type: 'text', text: message.content }],
    };

    setMessages(prev => [...prev, userMessage]);
    await handleSendMessage(message.content);
    return null;
  };

  const stop = async (): Promise<void> => {
    setStatus('ready');
  };

  const reload = async (): Promise<string | null | undefined> => {
    // 마지막 사용자 메시지를 다시 보내기
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      await handleSendMessage(lastUserMessage.content);
    }
    return null;
  };

  // setMessages를 Message[] 타입과 호환되게 만드는 래퍼
  const wrappedSetMessages = (messagesOrUpdater: any) => {
    if (typeof messagesOrUpdater === 'function') {
      setMessages(messagesOrUpdater);
    } else {
      setMessages(messagesOrUpdater);
    }
  };

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          selectedModelId={selectedModelId}
          user={user}
        />

        <Messages
          chatId={id}
          status={status}
          messages={messages}
          setMessages={wrappedSetMessages}
          reload={reload}
          isReadonly={isReadonly}
          append={append}
        />

        {/* 확인 버튼 렌더링, if문 마냥 pendigButtonMessage가 null 아닐 때만 렌더링 */}
        {pendingButtonMessage && (
          <div className="mx-auto px-4 pb-4 w-full md:max-w-3xl">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="text-sm text-muted-foreground">확인이 필요합니다:</div>
              <div className="text-sm">{pendingButtonMessage.message}</div>
              <div className="flex gap-2">
                {pendingButtonMessage.buttons.map((button: any) => (
                  <button
                    key={button.value}
                    type="button"
                    onClick={() => handleButtonClick(button.value)}
                    className={`px-4 py-2 text-sm rounded-md ${
                      button.value === 'yes' 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl" onSubmit={handleSubmit}>
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={wrappedSetMessages}
              append={append}
            />
          )}
        </form>
      </div>
    </>
  );
}

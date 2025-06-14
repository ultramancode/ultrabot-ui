'use client';

import type { Attachment, UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import { generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';

// 임시 타입 정의 (visibility 기능 제거 중)
type VisibilityType = 'private' | 'public';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [messages, setMessages] = useState<Array<UIMessage>>(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming' | 'error'>('ready');
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [pendingButtonMessage, setPendingButtonMessage] = useState<{message: string, buttons: any[]} | null>(null);


  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      const queryMessage: UIMessage = {
        id: generateUUID(),
        role: 'user',
        content: query,
        parts: [{ type: 'text', text: query }],
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, queryMessage]);
      handleSendMessage(query);
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, hasAppendedQuery, id]);

  // 투표 기능 비활성화 (현재는 백엔드에 vote API가 없음 -> 추가 후 활용)
  const votes = undefined;

  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  const handleSendMessage = async (messageContent: string, actionResponse?: string) => {
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
        createdAt: new Date(),
      };
      loadingMessageId = loadingMessage.id;
      setMessages(prev => [...prev, loadingMessage]);
    }
    
    try {
      const requestBody: any = { 
        message: messageContent,
        chat_id: id,
        user_id: session?.user?.id || "guest",
        selected_model: initialChatModel  // 선택된 모델 전달
      };
      if (actionResponse) {
        requestBody.action_response = actionResponse;
      }

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 응답 메시지 생성
      const assistantMessage: UIMessage = {
        id: loadingMessageId || generateUUID(),
        role: 'assistant',
        content: data.response || '',
        parts: [{ type: 'text', text: data.response || '' }],
        createdAt: new Date(),
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
      
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      
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
          createdAt: new Date(),
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
  };

  // 버튼 클릭 핸들러
  const handleButtonClick = async (buttonValue: string) => {
    if (!pendingButtonMessage) return;

    // 사용자가 버튼을 클릭했다는 메시지 추가
    const userMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      content: buttonValue === 'yes' ? '예' : '아니오',
      parts: [{ type: 'text', text: buttonValue === 'yes' ? '예' : '아니오' }],
      createdAt: new Date(),
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
      createdAt: new Date(),
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
      createdAt: new Date(),
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
          chatId={id}
          selectedModelId={initialChatModel}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={wrappedSetMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
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
              selectedVisibilityType={'private' as VisibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={wrappedSetMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={'private' as VisibilityType}
      />
    </>
  );
}

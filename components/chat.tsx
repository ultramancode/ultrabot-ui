'use client';

import type { Attachment, UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [messages, setMessages] = useState<Array<UIMessage>>(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming' | 'error'>('ready');
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

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

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    setStatus('streaming');
    
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 응답 메시지 추가 (백엔드에서 response 필드로 응답)
      const assistantMessage: UIMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: data.response || '',
        parts: [{ type: 'text', text: data.response || '' }],
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      setStatus('error');
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

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    if (event && event.preventDefault) {
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
          selectedVisibilityType={initialVisibilityType}
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
              selectedVisibilityType={visibilityType}
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
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}

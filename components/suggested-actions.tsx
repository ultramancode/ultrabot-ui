'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';

// UseChatHelpers 타입 정의
interface UseChatHelpers {
  append: (message: any) => void;
}

interface ApiDescriptionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
}

function PureApiDescriptions({
  chatId,
  append,
}: ApiDescriptionsProps) {
  const apiCapabilities = [
    {
      title: '📝 텍스트 생성',
      description: '다양한 주제의 글쓰기와 텍스트 생성',
      example: '블로그 포스트 작성해줘',
    },
    {
      title: '💻 코드 작성',
      description: '프로그래밍 코드 작성 및 디버깅',
      example: 'Python으로 웹 크롤러 만들어줘',
    },
    {
      title: '🔍 데이터 분석',
      description: '데이터 분석 및 시각화 도움',
      example: '이 데이터를 분석해서 인사이트 찾아줘',
    },
    {
      title: '🎯 문제 해결',
      description: '복잡한 문제의 해결책 제시',
      example: '이 오류를 어떻게 해결할 수 있을까?',
    },
  ];

  return (
    <motion.div
      className="grid auto-rows-fr grid-cols-2 gap-3 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {apiCapabilities.map((capability, index) => (
        <motion.div
          key={capability.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * index, duration: 0.25 }}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              append({
                role: 'user',
                content: capability.example,
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{capability.title}</span>
            <span className="text-muted-foreground">
              {capability.description}
            </span>
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}

export const ApiDescriptions = memo(
  PureApiDescriptions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;

    return true;
  },
);

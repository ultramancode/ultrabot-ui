'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from './icons';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import AuthService, { type User } from '@/lib/auth';

interface Model {
  id: string;
  name: string;
  description: string;
}

interface ModelSelectorProps extends ButtonProps {
  user: User;
  selectedModelId: string;
}

export function ModelSelector({
  user,
  selectedModelId,
  className,
  ...props
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/models`, {
          headers: {
            ...AuthService.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setModels(data);
        } else {
          // 기본 모델 목록 사용
          setModels([
            { id: 'gemma3:4b', name: 'Gemma 3 4B', description: '빠르고 효율적인 4B 파라미터 모델' },
            { id: 'gemma3:12b', name: 'Gemma 3 12B', description: '더 정확한 12B 파라미터 모델' },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // 기본 모델 목록 사용
        setModels([
          { id: 'gemma3:4b', name: 'Gemma 3 4B', description: '빠르고 효율적인 4B 파라미터 모델' },
          { id: 'gemma3:12b', name: 'Gemma 3 12B', description: '더 정확한 12B 파라미터 모델' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const selectedModel = models.find(model => model.id === selectedModelId);

  if (loading) {
    return (
      <Button
        variant="outline"
        className={cn('cursor-not-allowed opacity-50', className)}
        disabled
        {...props}
      >
        Loading...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'md:px-2 md:h-[34px] h-fit justify-start gap-2 md:gap-2',
            className,
          )}
          {...props}
        >
          <span className="text-xs font-medium md:flex">
            {selectedModel?.name || 'Select Model'}
          </span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onSelect={() => {
              // 모델 선택 로직은 부모 컴포넌트에서 처리
              window.location.href = `/?model=${model.id}`;
            }}
            className="gap-4 group/item flex flex-col items-start"
          >
            <div className="flex flex-col gap-1 items-start">
              <div className="font-medium">{model.name}</div>
              <div className="text-muted-foreground text-sm">
                {model.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

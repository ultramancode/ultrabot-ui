// Chat 타입 정의 (Python 백엔드와 호환)
interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
}
import { MoreHorizontalIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useSWRConfig } from 'swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { API_BASE_URL } from '@/lib/constants';
import {
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  PencilEditIcon,
  CheckCircleFillIcon,
  CrossIcon,
} from './icons';
import { memo, useState, useRef, useEffect } from 'react';
import AuthService from '@/lib/auth';

interface SidebarHistoryItemProps {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: SidebarHistoryItemProps) => {
  const { mutate } = useSWRConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleUpdate = async () => {
    if (!editTitle.trim() || editTitle === chat.title) {
      setIsEditing(false);
      setEditTitle(chat.title);
      return;
    }

    setIsUpdating(true);
    try {
      const authHeaders = AuthService.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/chat/${chat.id}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url
        });
        throw new Error(`Failed to update title: ${response.status} ${response.statusText}`);
      }

      // 성공 시 사이드바 히스토리 캐시 업데이트
      const user = AuthService.getUser();
      if (user) {
        // 모든 관련 캐시를 무효화하고 즉시 새로고침
        await mutate(
          (key) => 
            typeof key === 'string' && 
            key.includes('/chat/history') && 
            key.includes(`userId=${user.id}`),
          undefined,
          { revalidate: true }
        );
        
        // 추가적으로 기본 히스토리 캐시를 강제 새로고침
        await mutate(`${API_BASE_URL}/chat/history?userId=${user.id}&limit=7`, undefined, { revalidate: true });
        
        // 로컬 상태도 즉시 업데이트
        chat.title = editTitle.trim();
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
      setEditTitle(chat.title); // 원래 제목으로 되돌리기
    } finally {
      setIsUpdating(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleUpdate();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(chat.title);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        {isEditing ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleTitleUpdate}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              disabled={isUpdating}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleTitleUpdate}
                disabled={isUpdating}
                className="p-1 hover:bg-accent rounded"
              >
                <CheckCircleFillIcon size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(chat.title);
                }}
                disabled={isUpdating}
                className="p-1 hover:bg-accent rounded"
              >
                <CrossIcon size={12} />
              </button>
            </div>
          </div>
        ) : (
          <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
            <span>{chat.title}</span>
          </Link>
        )}
      </SidebarMenuButton>

      {!isEditing && (
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setIsEditing(true)}
            >
              <PencilEditIcon />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
              onSelect={() => onDelete(chat.id)}
            >
              <TrashIcon />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.chat.title !== nextProps.chat.title) return false;
  return true;
});

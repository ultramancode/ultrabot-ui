export const DEFAULT_CHAT_MODEL: string = 'gemma3:4b';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

// 백엔드에서 모델 목록을 가져오는 함수
export async function fetchAvailableModels(): Promise<ChatModel[]> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${API_BASE_URL}/models`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching models:', error);
    // 백엔드 연결 실패 시 기본 모델 목록 반환
    return [
      {
        id: 'gemma3:4b',
        name: 'Gemma 3 4B',
        description: 'Default model',
      }
    ];
  }
}

// 기본 모델 목록 (백엔드 연결 실패 시 사용)
export const chatModels: Array<ChatModel> = [
  {
    id: 'gemma3:4b',
    name: 'Gemma 3 4B',
    description: 'Default model',
  },
];

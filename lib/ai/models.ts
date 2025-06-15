import { API_BASE_URL } from '@/lib/constants';

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const getAvailableModels = async (): Promise<Array<Model>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/models`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    
    const models = await response.json();
    
    // Transform backend model format to frontend format
    return models.map((model: any) => ({
      id: model.id,
      label: model.name,
      apiIdentifier: model.id,
      description: model.description,
    }));
  } catch (error) {
    console.error('Error fetching models:', error);
    // Return default models as fallback
    return [
      {
        id: 'gemma3:4b',
        label: 'Gemma 3 4B',
        apiIdentifier: 'gemma3:4b',
        description: '빠르고 효율적인 4B 파라미터 모델',
      },
      {
        id: 'gemma3:12b',
        label: 'Gemma 3 12B',
        apiIdentifier: 'gemma3:12b',
        description: '더 정확한 12B 파라미터 모델',
      },
    ];
  }
}; 
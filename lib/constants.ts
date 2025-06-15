export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

// 더미 패스워드 (게스트 사용자용)
export const DUMMY_PASSWORD = process.env.NEXT_PUBLIC_DUMMY_PASSWORD || 'dummy-password-for-users';
// 기본 채팅 모델 설정
export const DEFAULT_CHAT_MODEL = 'gemma3:4b';

// Python 백엔드 API URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

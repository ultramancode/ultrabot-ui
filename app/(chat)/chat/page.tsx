import { redirect } from 'next/navigation';

export default function ChatPage() {
  // /chat 경로로 접근하면 메인 페이지로 리다이렉트
  redirect('/');
} 
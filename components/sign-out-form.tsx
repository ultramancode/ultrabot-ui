'use client';

import { useRouter } from 'next/navigation';
import AuthService from '@/lib/auth';
import { toast } from 'sonner';

export const SignOutForm = () => {
  const router = useRouter();

  const handleSignOut = () => {
    AuthService.clearAuth();
    router.push('/login');
    toast.success('Successfully signed out');
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};

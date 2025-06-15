'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import AuthService from '@/lib/auth';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인된 사용자는 홈으로 리다이렉트
    const user = AuthService.getUser();
    if (user) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        type: 'error',
        description: 'Please fill in all fields!',
      });
      return;
    }

    setEmail(email);
    setIsLoading(true);

    try {
      await AuthService.login(email, password);
      setIsSuccessful(true);
      
      toast({
        type: 'success',
        description: 'Successfully signed in!',
      });

      // 잠시 기다린 후 리다이렉트 (쿠키 설정 시간 확보)
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirectUrl');
        
        if (redirectUrl) {
          window.location.href = decodeURIComponent(redirectUrl);
        } else {
          window.location.href = '/';
        }
      }, 100);
    } catch (error) {
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : 'Login failed!',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>
            Sign in
          </SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              href="/register"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign up
            </Link>
            {' for free.'}
          </p>
          <div className="text-center">
            <button
              type="button"
              onClick={async () => {
                setIsLoading(true);
                try {
                  await AuthService.createGuest();
                  toast({
                    type: 'success',
                    description: 'Guest account created!',
                  });
                  router.push('/');
                } catch (error) {
                  toast({
                    type: 'error',
                    description: 'Failed to create guest account',
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              disabled={isLoading}
            >
              Continue as Guest
            </button>
          </div>
        </AuthForm>
      </div>
    </div>
  );
}

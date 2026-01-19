'use client';

import { signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui';

interface AuthButtonProps {
  isSignedIn: boolean;
}

export function AuthButton({ isSignedIn }: AuthButtonProps) {
  if (isSignedIn) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        Sign Out
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={() => signIn('google', { callbackUrl: '/groups' })}
    >
      Sign In with Google
    </Button>
  );
}

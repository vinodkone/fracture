import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { findOrCreateUserFromGoogle } from '@/lib/db/users';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        // Create or update user in our database
        await findOrCreateUserFromGoogle({
          id: profile.sub!,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        });
        return true;
      }
      return false;
    },
  },
});

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      googleId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      googleId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

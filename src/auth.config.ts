import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Base auth configuration without db callbacks
// This can be used in Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign in, add Google ID to token
      if (account?.provider === 'google' && profile) {
        token.googleId = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      // Add Google ID to session
      if (token.googleId) {
        session.user.googleId = token.googleId as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === '/login';
      const isApiRoute = nextUrl.pathname.startsWith('/api');

      // Allow API routes to handle their own auth
      if (isApiRoute) {
        return true;
      }

      // Redirect logged-in users away from login page
      if (isLoginPage && isLoggedIn) {
        return Response.redirect(new URL('/groups', nextUrl));
      }

      // Require auth for all other pages
      if (!isLoginPage && !isLoggedIn) {
        return false; // Will redirect to signIn page
      }

      return true;
    },
  },
};

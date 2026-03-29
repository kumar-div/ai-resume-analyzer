import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && token.user) {
        session.user = token.user;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      // If the callback URL is from next-auth signin, redirect to analyzer
      // Otherwise, allow redirect to home or other public pages
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/analyzer`;
      }
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allow redirects to same origin (prevent open redirects)
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

import type { NextAuthOptions } from 'next-auth';

export const authOptions = {
  providers: [],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.role = typeof token.role === 'string' ? token.role : '';
        session.user.schoolId = typeof token.schoolId === 'string' ? token.schoolId : undefined;
      }

      return session;
    },
  },
} satisfies NextAuthOptions;

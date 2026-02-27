import type { NextAuthConfig } from 'next-auth';

// Edge-compatible config for middleware (no Prisma/Node.js modules)
export const authConfigEdge: NextAuthConfig = {
    pages: {
        signIn: '/auth/login',
        error: '/auth/error',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAuthPage = nextUrl.pathname.startsWith('/auth');
            
            // Redirect logged-in users away from auth pages
            if (isLoggedIn && isOnAuthPage) {
                return Response.redirect(new URL('/', nextUrl));
            }
            
            return true;
        },
    },
    providers: [], // Empty for edge config - actual providers are in config.ts
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.AUTH_SECRET,
};

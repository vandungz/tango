import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

// Full config with providers (for API routes - not Edge compatible)
export const authConfig: NextAuthConfig = {
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
        jwt({ token, user }) {
            if (user) {
                token.id = user.id ?? '';
                token.username = (user as { username?: string }).username ?? '';
                token.email = user.email ?? '';
            }
            return token;
        },
        session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.username = token.username as string;
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                login: { label: 'Email or Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) {
                    return null;
                }

                const login = credentials.login as string;
                const password = credentials.password as string;

                // Find user by email or username
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: login.toLowerCase() },
                            { username: login },
                        ],
                    },
                });

                if (!user) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.AUTH_SECRET,
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfigEdge } from '@/lib/auth/config.edge';

const { auth } = NextAuth(authConfigEdge);

export async function proxy(request: NextRequest) {
    // Run auth check
    const session = await auth();
    const { pathname, search } = request.nextUrl;
    
    const isLoggedIn = !!session?.user;
    const isOnAuthPage = pathname.startsWith('/auth');

    // Require login before allowing access to app routes.
    if (!isLoggedIn && !isOnAuthPage) {
        const loginUrl = new URL('/auth/login', request.url);
        const callbackUrl = `${pathname}${search}`;
        loginUrl.searchParams.set('callbackUrl', callbackUrl);
        return NextResponse.redirect(loginUrl);
    }
    
    // Redirect logged-in users away from auth pages (except error page)
    if (isLoggedIn && isOnAuthPage && pathname !== '/auth/error') {
        return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Continue with request
    return NextResponse.next();
}

export const config = {
    // Specify which routes the proxy should run on
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (images, etc.)
         * - api routes (handled separately)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};

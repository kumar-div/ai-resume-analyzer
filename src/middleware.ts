import { withAuth } from 'next-auth/middleware';
import { NextRequest } from 'next/server';

// Protect dashboard and analysis routes
export const middleware = withAuth(
  function middleware(req: NextRequest) {
    return undefined;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect dashboard and analysis routes
        if (
          req.nextUrl.pathname.startsWith('/dashboard') ||
          req.nextUrl.pathname.startsWith('/analysis')
        ) {
          return !!token; // Require authentication
        }

        // Public routes: allow access
        return true;
      },
    },
    pages: {
      signIn: '/login', // Redirect to login if not authenticated
    },
  }
);

// Apply middleware only to protected routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analysis/:path*',
    // You can add other protected routes here
  ],
};

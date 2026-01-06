import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public routes)
     * - api/proxy-html (public API for HTML proxy)
     * - image files
     */
    '/((?!_next/static|_next/image|favicon.ico|checklist-public|api/proxy-html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


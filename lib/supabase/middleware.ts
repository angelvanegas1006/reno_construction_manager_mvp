import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Update session but don't block access
  // The app currently uses mock authentication (localStorage)
  // This middleware only updates the Supabase session for when we migrate to Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteger rutas de rent - verificar que el usuario tenga rol de rent
  // NOTA: Solo protegemos /rent/*, dejamos /reno/* sin protección para no romper el proyecto de Ángel
  if (request.nextUrl.pathname.startsWith('/rent') && !request.nextUrl.pathname.startsWith('/rent/api')) {
    // Rutas públicas de rent (si las hay)
    const publicRentRoutes = ['/rent/login'];
    const isPublicRoute = publicRentRoutes.some(route => request.nextUrl.pathname === route);
    
    if (!isPublicRoute && user) {
      // Verificar que el usuario tenga un rol de rent
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        const userRole = roleData?.role;
        const rentRoles = ['rent_manager', 'rent_agent', 'tenant', 'admin'];
        
        if (!userRole || !rentRoles.includes(userRole)) {
          // Usuario no tiene permisos para acceder a rent
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('error', 'no_permission');
          url.searchParams.set('message', 'No tienes permisos para acceder a la sección de alquileres');
          return NextResponse.redirect(url);
        }
      } catch (error) {
        // Error al verificar rol, redirigir a login
        console.error('[Middleware] Error checking rent role:', error);
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
    } else if (!isPublicRoute && !user) {
      // Usuario no autenticado, redirigir a login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // NOTA: No protegemos rutas /reno/* para mantener compatibilidad con el proyecto de Ángel
  // Las rutas /reno/* funcionan como antes (sin bloqueo de acceso)

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}


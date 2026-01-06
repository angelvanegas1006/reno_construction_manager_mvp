/**
 * Error Suppression for Auth Session Missing Errors
 * 
 * This file suppresses "Auth session missing!" errors that are expected
 * when users authenticate with Auth0 (which doesn't create a Supabase session).
 * 
 * This file should be imported as early as possible, ideally in the root layout.
 */

if (typeof window !== 'undefined') {
  // Solo instalar una vez usando una propiedad en window
  if (!(window as any).__supabaseErrorInterceptorsInstalled) {
    (window as any).__supabaseErrorInterceptorsInstalled = true;
    
    // Guardar referencias originales
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalTrace = console.trace?.bind(console);
    
    // Función helper para detectar errores de sesión faltante
    const isAuthSessionMissingError = (arg: any): boolean => {
      if (!arg) return false;
      
      const errorMessage = typeof arg === 'string' ? arg : arg?.message || arg?.toString() || '';
      const errorName = arg?.name || '';
      const errorStack = arg?.stack || '';
      
      return (
        errorMessage.includes('Auth session missing') ||
        errorMessage.includes('AuthSessionMissingError') ||
        errorName === 'AuthSessionMissingError' ||
        errorStack.includes('AuthSessionMissingError') ||
        errorStack.includes('_useSession') ||
        errorStack.includes('_getUser') ||
        errorStack.includes('SupabaseAuthClient')
      );
    };
    
    // Interceptar console.error con mejor detección
    console.error = (...args: any[]) => {
      // Verificar si alguno de los argumentos es un error de sesión faltante
      const hasAuthSessionError = args.some(arg => isAuthSessionMissingError(arg));
      
      if (hasAuthSessionError) {
        // No mostrar el error en consola, es esperado cuando no hay sesión de Supabase
        return;
      }
      // Para otros errores, mostrarlos normalmente
      originalError(...args);
    };
    
    // También interceptar console.warn
    console.warn = (...args: any[]) => {
      const hasAuthSessionError = args.some(arg => isAuthSessionMissingError(arg));
      
      if (hasAuthSessionError) {
        return;
      }
      originalWarn(...args);
    };
    
    // Interceptar console.trace si existe
    if (originalTrace) {
      console.trace = (...args: any[]) => {
        const hasAuthSessionError = args.some(arg => isAuthSessionMissingError(arg));
        if (!hasAuthSessionError) {
          originalTrace(...args);
        }
      };
    }
    
    // Interceptar errores no capturados a nivel de window
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      // Si el error es "Auth session missing!", no mostrarlo
      if (error && isAuthSessionMissingError(error)) {
        return true; // Prevenir que el error se muestre en la consola
      }
      if (typeof message === 'string' && message.includes('Auth session missing')) {
        return true;
      }
      // Para otros errores, llamar al handler original si existe
      if (originalOnError) {
        return originalOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };
    
    // Interceptar promesas rechazadas no capturadas
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      // Si el error es "Auth session missing!", prevenir que se muestre
      if (event.reason && isAuthSessionMissingError(event.reason)) {
        event.preventDefault();
        return;
      }
      if (typeof event.reason === 'string' && event.reason.includes('Auth session missing')) {
        event.preventDefault();
        return;
      }
      // Para otros errores, llamar al handler original si existe
      if (originalUnhandledRejection) {
        return originalUnhandledRejection.call(window, event);
      }
    };
  }
}


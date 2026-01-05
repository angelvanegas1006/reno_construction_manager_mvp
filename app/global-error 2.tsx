'use client';

// Workaround para evitar error de prerender en Next.js 16
// Este componente solo se renderiza cuando hay un error crítico
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Renderizar sin usar ningún hook que requiera contexto
  if (typeof window === 'undefined') {
    // Durante SSR, retornar HTML básico sin JavaScript
    return (
      <html>
        <body>
          <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Something went wrong!</h1>
            <p>An error occurred. Please refresh the page.</p>
          </div>
        </body>
      </html>
    );
  }

  // En el cliente, usar el reset normalmente
  return (
    <html>
      <body>
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong!</h1>
          <p>{error?.message || 'An unexpected error occurred'}</p>
          <button 
            onClick={reset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '500px', 
        width: '100%', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>404</h1>
        <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
          Página no encontrada
        </h2>
        <p style={{ color: '#666', margin: 0 }}>
          La página que buscas no existe o ha sido movida.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
          <button 
            onClick={() => router.back()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Volver
          </button>
          <button 
            onClick={() => router.push('/')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#0070f3',
              border: '1px solid #0070f3',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}


import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/page'

// Mock useRouter
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
    usePathname: () => '/',
}))

// Mock useAuth
vi.mock('@/lib/auth', () => ({
    useAuth: () => ({
        login: vi.fn(),
        user: null,
    }),
}))

describe('LoginPage', () => {
    it('renders the login form', () => {
        render(<LoginPage />)

        expect(screen.getByText('Inicia sesión o crea una cuenta')).toBeDefined()
        expect(screen.getByText('Selecciona tu rol (Simulación Auth0)')).toBeDefined()
    })
})

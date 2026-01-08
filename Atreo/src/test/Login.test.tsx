import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Login from '../pages/auth/Login'

// Mock the auth context
const mockLogin = vi.fn()
const mockAuthContext = {
  user: null,
  isLoading: false,
  login: mockLogin,
  logout: vi.fn(),
  signup: vi.fn(),
  setUser: vi.fn(),
}

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock react-icons
vi.mock('react-icons/fi', () => ({
  FiEye: () => <div data-testid="eye-icon" />,
  FiEyeOff: () => <div data-testid="eye-off-icon" />,
}))

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form correctly', () => {
    render(<Login onSwitchToSignup={() => {}} />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<Login onSwitchToSignup={() => {}} />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    render(<Login onSwitchToSignup={() => {}} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('calls login function with correct credentials', async () => {
    render(<Login onSwitchToSignup={() => {}} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('toggles password visibility', () => {
    render(<Login onSwitchToSignup={() => {}} />)
    
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    const toggleButton = screen.getByTestId('eye-icon').parentElement
    
    expect(passwordInput.type).toBe('password')
    
    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('text')
    }
  })

  it('shows loading state during login', () => {
    mockAuthContext.isLoading = true
    render(<Login onSwitchToSignup={() => {}} />)
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })
})
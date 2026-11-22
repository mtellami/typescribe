import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';
import { AccountForm } from './AccountForm';

const mocks = vi.hoisted(() => ({
  social: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: mocks.social } },
}));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('Google authentication', () => {
  it.each(['login', 'signup'] as const)(
    'starts Google sign-in from %s without requiring email/password fields',
    async (mode) => {
      mocks.social.mockResolvedValue({
        data: { url: 'https://accounts.google.com' },
        error: null,
      });
      render(<AuthForm mode={mode} googleEnabled />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Continue with Google' }),
      );
      await waitFor(() =>
        expect(mocks.social).toHaveBeenCalledWith({
          provider: 'google',
          callbackURL: '/',
          errorCallbackURL: '/login?error=oauth',
        }),
      );
      expect(
        screen.getByRole('button', { name: 'Connecting to Google…' }),
      ).toBeDisabled();
      expect(screen.getByLabelText('Email')).toBeDisabled();
    },
  );

  it('hides the provider when credentials are not configured', () => {
    render(<AuthForm mode="login" />);
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).not.toBeInTheDocument();
  });

  it('allows retrying when starting OAuth fails', async () => {
    mocks.social.mockResolvedValue({ error: { message: 'Provider failure' } });
    render(<AuthForm mode="login" googleEnabled />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not start Google sign-in.',
    );
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled();
  });

  it('explains a cancelled or failed callback', () => {
    render(<AuthForm mode="login" googleEnabled oauthError />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Google sign-in was cancelled or could not be completed.',
    );
  });

  it('hides the Typescribe password form for Google-only users', () => {
    render(
      <AccountForm
        name="Google User"
        email="google@example.com"
        hasPassword={false}
      />,
    );
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Manage your password in your Google account/),
    ).toBeInTheDocument();
  });
});

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_KEY = 'ls_pending_action'; // NEW — same key the store uses

const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconBag = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconTicket = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="13" y1="7" x2="13" y2="17" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 2" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 7l8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconKey = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10.8 12.2L20 3M17 6l2.5 2.5M14 9l1.8 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/* NEW — reads ?returnTo= and only accepts safe, same-site relative paths.
   Accepts:  /shivam/store   /rahul/store?category=shoes
   Rejects:  https://evil.com   //evil.com   /\evil.com   /login...   control chars */
function getSafeReturnTo() {
  if (typeof window === 'undefined') return null;

  const value = new URLSearchParams(window.location.search).get('returnTo');

  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  if (/[\r\n\t]/.test(value)) return null;
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) return null;

  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');

  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginStatus, setLoginStatus] = useState('idle');
  const [loginMessage, setLoginMessage] = useState('');

  const [signupData, setSignupData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [signupShowConfirmPassword, setSignupShowConfirmPassword] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});
  const [signupStatus, setSignupStatus] = useState('idle');
  const [signupMessage, setSignupMessage] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);

  // NEW — /login opened manually (no returnTo): drop any stale shopping intent
  useEffect(() => {
    if (!getSafeReturnTo()) {
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!forgotOpen || forgotStep !== 'code' || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? (clearInterval(timer), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotOpen, forgotStep, secondsLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // CHANGED — Back returns to the store if we came from one
  const goHome = () => router.push(getSafeReturnTo() || '/');

  // NEW — shared post-auth redirect (login + signup)
  const goAfterAuth = () => router.replace(getSafeReturnTo() || '/dashboard');

  const switchTab = (tab) => {
    setActiveTab(tab);
    setLoginStatus('idle');
    setSignupStatus('idle');
    setLoginMessage('');
    setSignupMessage('');
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const validateLogin = () => {
    const errors = {};
    if (!loginData.identifier.trim()) errors.identifier = 'Email or username is required.';
    if (!loginData.password) errors.password = 'Password is required.';
    return errors;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const errors = validateLogin();
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoginStatus('loading');
    setLoginMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setLoginStatus('error');
        setLoginMessage(data.message || 'Something went wrong.');
        return;
      }

      setLoginStatus('success');
      setLoginMessage('Login successful. Redirecting...');
      goAfterAuth(); // CHANGED (was router.push('/dashboard'))
    } catch {
      setLoginStatus('error');
      setLoginMessage('Something went wrong. Please try again.');
    }
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const validateSignup = () => {
    const errors = {};

    if (!signupData.username.trim()) {
      errors.username = 'Username is required.';
    } else if (signupData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (!USERNAME_PATTERN.test(signupData.username)) {
      errors.username = 'Only letters, numbers and underscores are allowed.';
    }

    if (!signupData.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(signupData.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!signupData.password) {
      errors.password = 'Password is required.';
    } else {
      const problems = [];
      if (signupData.password.length < 8) problems.push('8 characters');
      if (!/[A-Z]/.test(signupData.password)) problems.push('uppercase letter');
      if (!/[a-z]/.test(signupData.password)) problems.push('lowercase letter');
      if (!/[0-9]/.test(signupData.password)) problems.push('number');
      if (!/[^A-Za-z0-9]/.test(signupData.password)) problems.push('special character');
      if (problems.length > 0) errors.password = `Password needs ${problems.join(', ')}.`;
    }

    if (!signupData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (signupData.confirmPassword !== signupData.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const errors = validateSignup();
    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignupStatus('loading');
    setSignupMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupData.username,
          email: signupData.email,
          password: signupData.password,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSignupStatus('error');
        setSignupMessage(data.message || 'Something went wrong.');
        return;
      }

      setSignupStatus('success');
      setSignupMessage('Account created. Redirecting...');
      goAfterAuth(); // CHANGED (was router.push('/dashboard'))
    } catch {
      setSignupStatus('error');
      setSignupMessage('Something went wrong. Please try again.');
    }
  };

  const openForgotPassword = () => {
    setForgotOpen(true);
    setForgotStep('email');
    setForgotEmail(loginData.identifier.includes('@') ? loginData.identifier : '');
    setForgotCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotMessage('');
    setForgotError('');
  };

  const closeForgotPassword = () => {
    setForgotOpen(false);
    setForgotStep('email');
    setForgotMessage('');
    setForgotError('');
  };

  const sendCode = async () => {
    setForgotError('');
    setForgotMessage('');

    if (!forgotEmail.trim()) return setForgotError('Enter your email address.');
    if (!EMAIL_PATTERN.test(forgotEmail.trim())) return setForgotError('Enter a valid email address.');

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgotPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setForgotError(data.message || 'Unable to send code.');
        return;
      }

      setForgotStep('code');
      setSecondsLeft(300);
      setForgotMessage('Verification code sent to your email.');
    } catch {
      setForgotError('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const verifyCode = async () => {
    setForgotError('');
    setForgotMessage('');

    if (secondsLeft <= 0) return setForgotError('Verification code has expired.');
    if (!/^\d{6}$/.test(forgotCode)) return setForgotError('Enter the 6-digit verification code.');

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/verifyCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), code: forgotCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setForgotError(data.message || 'Invalid verification code.');
        return;
      }

      setForgotStep('password');
      setForgotMessage('Email verified successfully.');
    } catch {
      setForgotError('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const changePassword = async () => {
    setForgotError('');
    setForgotMessage('');

    if (!newPassword) return setForgotError('Enter your new password.');
    if (newPassword.length < 8) return setForgotError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      return setForgotError('Password needs uppercase, lowercase, number and special character.');
    }
    if (newPassword !== confirmNewPassword) return setForgotError('Passwords do not match.');

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/resetPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), code: forgotCode, password: newPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setForgotError(data.message || 'Unable to reset password.');
        return;
      }

      setForgotMessage('Password changed successfully. You can login now.');
      setTimeout(closeForgotPassword, 1500);
    } catch {
      setForgotError('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left side — login / signup form */}
      <div className="auth-form-section">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-small-title">WELCOME BACK</span>
            <h2>{activeTab === 'login' ? 'Sign in to LinkStorX' : 'Create your account'}</h2>
            <p>{activeTab === 'login' ? 'Enter your details to continue.' : 'Start building your digital space today.'}</p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab${activeTab === 'login' ? ' auth-tab-active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab${activeTab === 'signup' ? ' auth-tab-active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {activeTab === 'login' && (
            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
              <div className="auth-field">
                <label>Email or Username</label>
                <input
                  name="identifier"
                  type="text"
                  value={loginData.identifier}
                  onChange={handleLoginChange}
                  placeholder="you@example.com"
                  className={`auth-input${loginErrors.identifier ? ' auth-input-error' : ''}`}
                />
                {loginErrors.identifier && <p className="auth-error-text">{loginErrors.identifier}</p>}
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label>Password</label>
                  <button type="button" className="auth-forgot-link" onClick={openForgotPassword}>
                    Forgot password?
                  </button>
                </div>
                <div className="auth-password-wrapper">
                  <input
                    name="password"
                    type={loginShowPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    className={`auth-input${loginErrors.password ? ' auth-input-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setLoginShowPassword((prev) => !prev)}
                  >
                    {loginShowPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {loginErrors.password && <p className="auth-error-text">{loginErrors.password}</p>}
              </div>

              {loginStatus === 'error' && <div className="auth-status-message auth-status-error">{loginMessage}</div>}
              {loginStatus === 'success' && <div className="auth-status-message auth-status-success">{loginMessage}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loginStatus === 'loading'}>
                {loginStatus === 'loading' ? <span className="auth-spinner" /> : (<>Continue<span>→</span></>)}
              </button>
            </form>
          )}

          {activeTab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignupSubmit} noValidate>
              <div className="auth-field">
                <label>Username</label>
                <input
                  name="username"
                  type="text"
                  value={signupData.username}
                  onChange={handleSignupChange}
                  placeholder="yourusername"
                  className={`auth-input${signupErrors.username ? ' auth-input-error' : ''}`}
                />
                {signupErrors.username && <p className="auth-error-text">{signupErrors.username}</p>}
              </div>

              <div className="auth-field">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={signupData.email}
                  onChange={handleSignupChange}
                  placeholder="you@example.com"
                  className={`auth-input${signupErrors.email ? ' auth-input-error' : ''}`}
                />
                {signupErrors.email && <p className="auth-error-text">{signupErrors.email}</p>}
              </div>

              <div className="auth-field">
                <label>Password</label>
                <div className="auth-password-wrapper">
                  <input
                    name="password"
                    type={signupShowPassword ? 'text' : 'password'}
                    value={signupData.password}
                    onChange={handleSignupChange}
                    placeholder="Create a strong password"
                    className={`auth-input${signupErrors.password ? ' auth-input-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setSignupShowPassword((prev) => !prev)}
                  >
                    {signupShowPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {signupErrors.password && <p className="auth-error-text">{signupErrors.password}</p>}
              </div>

              <div className="auth-field">
                <label>Confirm Password</label>
                <div className="auth-password-wrapper">
                  <input
                    name="confirmPassword"
                    type={signupShowConfirmPassword ? 'text' : 'password'}
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    placeholder="Repeat your password"
                    className={`auth-input${signupErrors.confirmPassword ? ' auth-input-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setSignupShowConfirmPassword((prev) => !prev)}
                  >
                    {signupShowConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {signupErrors.confirmPassword && <p className="auth-error-text">{signupErrors.confirmPassword}</p>}
              </div>

              {signupStatus === 'error' && <div className="auth-status-message auth-status-error">{signupMessage}</div>}

              <button type="submit" className="auth-submit-btn" disabled={signupStatus === 'loading'}>
                {signupStatus === 'loading' ? <span className="auth-spinner" /> : (<>Create Account<span>→</span></>)}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right side — branding */}
      <div className="auth-branding">
        <div className="auth-branding-content">
          <div className="auth-top-row">
            <button type="button" className="home-btn" onClick={goHome}>
              <IconBack />
              Back
            </button>
            <div className="auth-logo">
              LinkStor<span>X</span>
            </div>
          </div>

          <h1>
            Everything you need.
            <br />
            <span>All in one place.</span>
          </h1>

          <p className="auth-tagline">
            Create your custom link-in-bio, host events, sell your products, and grow your business — all from a single powerful platform.
          </p>

          <div className="showcase-wrap">
            <div className="showcase-card">
              <span className="showcase-tag">Your Digital Hub</span>
              <h3>Grow Your Business</h3>
              <p>Link-in-bio pages, eCommerce stores, event hosting, and more — built for creators and sellers.</p>
            </div>

            <div className="showcase-chip chip-top">
              <span className="chip-icon chip-icon-blue">
                <IconBag />
              </span>
              <div className="chip-text">
                <strong>Sell Products</strong>
                <span>Built-in eCommerce</span>
              </div>
            </div>

            <div className="showcase-chip chip-bottom">
              <span className="chip-icon chip-icon-amber">
                <IconTicket />
              </span>
              <div className="chip-text">
                <strong>Host Events</strong>
                <span>Manage & promote</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="forgot-overlay" onMouseDown={closeForgotPassword}>
          <div className="forgot-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="forgot-close" onClick={closeForgotPassword}>
              <IconClose />
            </button>

            {forgotStep === 'email' && (
              <>
                <div className="forgot-icon"><IconLock /></div>
                <h3>Forgot your password?</h3>
                <p>Enter your email and we'll send you a 6-digit verification code.</p>

                <div className="auth-field">
                  <label>Email address</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                {forgotError && <div className="auth-status-message auth-status-error">{forgotError}</div>}

                <button className="auth-submit-btn" type="button" onClick={sendCode} disabled={forgotLoading}>
                  {forgotLoading ? <span className="auth-spinner" /> : (<>Send Code<span>→</span></>)}
                </button>
              </>
            )}

            {forgotStep === 'code' && (
              <>
                <div className="forgot-icon"><IconMail /></div>
                <h3>Check your email</h3>
                <p>We sent a verification code to <strong>{forgotEmail}</strong></p>

                <div className="code-input-wrapper">
                  <input
                    className="code-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                  />
                </div>

                <div className={secondsLeft === 0 ? 'timer expired' : 'timer'}>
                  {secondsLeft === 0 ? 'Code expired' : `Code expires in ${formatTime(secondsLeft)}`}
                </div>

                {forgotMessage && <div className="auth-status-message auth-status-success">{forgotMessage}</div>}
                {forgotError && <div className="auth-status-message auth-status-error">{forgotError}</div>}

                <button
                  className="auth-submit-btn"
                  type="button"
                  onClick={verifyCode}
                  disabled={forgotLoading || secondsLeft === 0}
                >
                  {forgotLoading ? <span className="auth-spinner" /> : (<>Verify Code<span>→</span></>)}
                </button>

                {secondsLeft === 0 && (
                  <button className="resend-button" type="button" onClick={sendCode}>
                    Send a new code
                  </button>
                )}
              </>
            )}

            {forgotStep === 'password' && (
              <>
                <div className="forgot-icon"><IconKey /></div>
                <h3>Create new password</h3>
                <p>Your email has been verified. Create a new password below.</p>

                <div className="auth-field">
                  <label>New password</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                </div>

                <div className="auth-field">
                  <label>Confirm password</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat password"
                  />
                </div>

                {forgotError && <div className="auth-status-message auth-status-error">{forgotError}</div>}
                {forgotMessage && <div className="auth-status-message auth-status-success">{forgotMessage}</div>}

                <button className="auth-submit-btn" type="button" onClick={changePassword} disabled={forgotLoading}>
                  {forgotLoading ? <span className="auth-spinner" /> : 'Change Password'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
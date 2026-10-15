'use client';

import React, { useEffect, useRef, useState } from 'react';
import { safeNextPath } from '../../lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => userRef.current?.focus(), []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setError('Isi nama pengguna dan kata sandi.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        // Full navigation so the middleware sees the new session cookie.
        window.location.replace(safeNextPath(new URLSearchParams(window.location.search).get('next')));
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error || 'Login gagal. Coba lagi.');
      setPassword('');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    }
    setSubmitting(false);
  };

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true" />
      <form className="login-card" onSubmit={handleSubmit} noValidate aria-describedby={error ? 'login-error' : undefined}>
        <span className="brand login-brand">CINEBOX</span>
        <h1>Masuk</h1>
        <p className="login-sub">Situs ini privat. Masuk untuk mulai menonton.</p>

        <label className="login-field">
          <span>Nama pengguna</span>
          <input
            ref={userRef}
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={event => setUsername(event.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="login-field">
          <span>Kata sandi</span>
          <span className="login-password">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="login-reveal"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={showPassword}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
            </button>
          </span>
        </label>

        {error && (
          <p className="login-error" id="login-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {error}
          </p>
        )}

        <button type="submit" className="btn login-submit" disabled={submitting}>
          {submitting ? <span className="spinner spinner-sm" aria-hidden="true"></span> : null}
          {submitting ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}

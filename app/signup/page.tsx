'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signToken } from '@/lib/auth';
import { createUser } from '@/lib/db';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { getUserByEmail } = await import('@/lib/db');
      await createUser(email, password);
      const user = await getUserByEmail(email);
      if (!user) throw new Error('User creation failed');
      const token = await signToken({ userId: user.id, role: user.role });
      document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
      router.push('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed. Email may already exist.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <nav className="nav container">
        <Link href="/">Algomate</Link>
        <Link href="/login">Log in</Link>
      </nav>
      <div className="container" style={{ maxWidth: '400px' }}>
        <div className="card">
          <h1>Sign Up</h1>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

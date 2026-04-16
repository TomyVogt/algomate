'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signToken } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await getUserByEmail(email);
      if (!user) { setError('No account found with this email'); return; }
      const { verifyPassword } = await import('@/lib/auth');
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) { setError('Incorrect password'); return; }
      const token = await signToken({ userId: user.id, role: user.role });
      document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
      router.push('/profile');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <nav className="nav container">
        <Link href="/">Algomate</Link>
        <Link href="/signup">Sign up</Link>
      </nav>
      <div className="container" style={{ maxWidth: '400px' }}>
        <div className="card">
          <h1>Log In</h1>
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
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

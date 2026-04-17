'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { signToken, verifyPassword } from '@/lib/auth';
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
      if (!user) { setError('No account found with this email'); setLoading(false); return; }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) { setError('Incorrect password'); setLoading(false); return; }
      const token = await signToken({ userId: user.id, role: user.role });
      document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
      router.push('/profile');
    } catch {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container-main max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold mb-6">Welcome Back</h1>
          {error && <p className="error bg-red-50 p-3 rounded-lg">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <p className="text-center text-gray-600 mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-violet-600 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
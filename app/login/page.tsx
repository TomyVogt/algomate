'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { signToken, verifyPassword } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';

const QUICK_USERS = [
  { name: 'Marcus', email: 'Marcus@algomate.local' },
  { name: 'Leonie', email: 'Leonie@algomate.local' },
  { name: 'Sophia', email: 'Sophia@algomate.local' },
  { name: 'Julian', email: 'Julian@algomate.local' },
  { name: 'Emilia', email: 'Emilia@algomate.local' },
  { name: 'Theodor', email: 'Theodor@algomate.local' },
  { name: 'Lukas', email: 'Lukas@algomate.local' },
  { name: 'Noah', email: 'Noah@algomate.local' },
  { name: 'Helena', email: 'Helena@algomate.local' },
  { name: 'Felix', email: 'Felix@algomate.local' },
  { name: 'Admin', email: 'admin@algomate.local' },
];

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

  async function handleQuickLogin(userEmail: string) {
    setError('');
    setLoading(true);
    try {
      const user = await getUserByEmail(userEmail);
      if (!user) { setError('User not found'); setLoading(false); return; }
      const token = await signToken({ userId: user.id, role: user.role });
      document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
      router.push('/profile');
    } catch {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="container-main max-w-md">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-6">Welcome Back</h1>
          {error && <p className="error bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="mb-6">
            <p className="text-sm font-medium mb-3" style={{ color: '#666' }}>Quick Login (Test Users)</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="btn-secondary text-sm py-2"
                  onClick={() => handleQuickLogin(u.email)}
                  disabled={loading}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: '#e5e7eb' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white" style={{ color: '#666' }}>Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-secondary w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <p className="text-center mt-4" style={{ color: '#666' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline" style={{ color: '#849fcf' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
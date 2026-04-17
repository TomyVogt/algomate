'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { signToken } from '@/lib/auth';
import { createUser, getUserByEmail } from '@/lib/db';

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
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="container-main max-w-md">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-6">Create Account</h1>
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
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
          <p className="text-center mt-4" style={{ color: '#666' }}>
            Already have an account?{' '}
            <Link href="/login" className="underline" style={{ color: '#849fcf' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
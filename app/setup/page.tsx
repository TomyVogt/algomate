'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUser, getUserByEmail } from '@/lib/db';
import { signToken } from '@/lib/auth';

export default function Setup() {
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function setup() {
      try {
        const existing = await getUserByEmail('admin@algomate.local');
        if (existing) {
          setStatus('Admin already exists. Logging in...');
          const token = await signToken({ userId: existing.id, role: existing.role });
          document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
          setTimeout(() => router.push('/profile'), 1000);
          setDone(true);
          return;
        }

        await createUser('admin@algomate.local', 'Admin', 'admin');
        const user = await getUserByEmail('admin@algomate.local');
        if (user) {
          const token = await signToken({ userId: user.id, role: user.role });
          document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
          setStatus('Admin created! Redirecting to profile...');
          setDone(true);
          setTimeout(() => router.push('/profile'), 1500);
        }
      } catch (err) {
        setStatus('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
    setup();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Algomate Setup</h1>
        <p className="text-gray-600 mb-4">Creating admin account...</p>
        <p className="text-lg font-mono bg-gray-100 p-3 rounded">
          Username: <strong>Admin</strong><br/>
          Password: <strong>Admin</strong>
        </p>
        {status && (
          <p className={`mt-4 ${done ? 'text-emerald-600' : 'text-gray-500'}`}>{status}</p>
        )}
      </div>
    </div>
  );
}
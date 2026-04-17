import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="container-main">
        <div className="card text-center py-12 px-6">
          <h1 className="headline text-4xl font-bold mb-4">Find Real Connections</h1>
          <p className="text-xl mb-8 max-w-xl mx-auto" style={{ color: '#666666' }}>
            Algomate shows you <strong>who you really match with</strong> — not just profiles,
            but authentic comparisons and compatibility scores that help you find your people.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup">
              <button className="btn-primary text-lg px-8 py-3">Get Started</button>
            </Link>
            <Link href="/login">
              <button className="btn-secondary text-lg px-8 py-3">Log in</button>
            </Link>
          </div>
        </div>
        <div className="card">
          <h2 className="headline text-2xl font-bold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-3">
            <li><strong>Sign up</strong> and create your profile with your values, interests, and hobbies</li>
            <li><strong>Enter the Matching Playground</strong> and see how you compare to others</li>
            <li><strong>Get a compatibility score</strong> between 1 and 10 based on authenticity</li>
            <li><strong>Match, disregard, or decline</strong> — only if both agree, you connect</li>
            <li><strong>Chat and share</strong> — once matched, exchange messages and decide together to reveal full profiles</li>
          </ol>
        </div>
        <div className="card border-2" style={{ borderColor: '#90c367' }}>
          <h2 className="headline text-2xl font-bold mb-4">Ready to find your people?</h2>
          <p className="mb-6" style={{ color: '#666666' }}>Join thousands of people looking for real, authentic connections.</p>
          <Link href="/signup">
            <button className="btn-primary text-lg px-8 py-3">Create Free Account</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
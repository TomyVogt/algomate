import Link from 'next/link';
import './globals.css';

export default function Home() {
  return (
    <div>
      <nav className="nav container">
        <Link href="/">Algomate</Link>
        <Link href="/login">Log in</Link>
        <Link href="/signup">Sign up</Link>
      </nav>
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <h1>Find Real Connections</h1>
          <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '32px', marginTop: '16px' }}>
            Algomate shows you <strong>who you really match with</strong> — not just profiles,
            but authentic comparisons and compatibility scores that help you find your people.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/signup"><button className="btn-primary">Get Started</button></Link>
            <Link href="/login"><button className="btn-secondary">Log in</button></Link>
          </div>
        </div>
        <div className="card">
          <h2>How It Works</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '2' }}>
            <li><strong>Sign up</strong> and create your profile with your values, interests, and hobbies</li>
            <li><strong>Enter the Matching Playground</strong> and see how you compare to others</li>
            <li><strong>Get a compatibility score</strong> between 1 and 10 based on authenticity</li>
            <li><strong>Match, disregard, or decline</strong> — only if both agree, you connect</li>
            <li><strong>Chat and share</strong> — once matched, exchange messages and decide together to reveal full profiles</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

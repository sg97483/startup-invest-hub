import Link from 'next/link';

export default function Header() {
  return (
    <header className="glass-panel app-header" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          S
        </div>
        StartupHub
      </Link>
      
      <nav>
        <ul style={{ display: 'flex', gap: '1rem' }}>
          <li>
            <Link href="/" className="glass-button">
              리스트 뷰
            </Link>
          </li>
          <li>
            <Link href="/calendar" className="glass-button">
              캘린더 뷰
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

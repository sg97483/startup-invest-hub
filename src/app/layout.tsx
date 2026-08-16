import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Startup Support Hub',
  description: '스타트업 투자 및 지원 사업 일정을 한눈에 파악하세요.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}

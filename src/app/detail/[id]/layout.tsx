/**
 * 공고가 1,700건이 넘어 전 건을 미리 렌더링하지 않고 요청 시점에 렌더링합니다.
 * 실제 데이터는 클라이언트에서 /data/programs.json 을 받아 채웁니다.
 */
export default function DetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

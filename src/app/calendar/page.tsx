'use client';

import { useState, useEffect } from 'react';
import { SupportProgram } from '@/types';
import { fetchSupportPrograms } from '@/lib/api';
import Link from 'next/link';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [programs, setPrograms] = useState<SupportProgram[]>([]);

  useEffect(() => {
    async function loadData() {
      const data = await fetchSupportPrograms();
      setPrograms(data);
    }
    loadData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDate = (day: number) => {
    const targetDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return programs.filter(program => program.endDate === targetDateString);
  };

  return (
    <div>
      <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            일정 캘린더
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            마감일을 기준으로 다가오는 지원 사업을 확인하세요.
          </p>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem' }}>
          <button className="glass-button" onClick={prevMonth}>&lt;</button>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{year}년 {month + 1}월</span>
          <button className="glass-button" onClick={nextMonth}>&gt;</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem' }}>
        {/* Calendar Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} style={{ color: d === '일' ? '#f87171' : d === '토' ? '#60a5fa' : 'inherit' }}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day-cell" style={{ minHeight: '100px' }}></div>
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const events = getEventsForDate(day);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return (
              <div key={day} className="calendar-day-cell" style={{
                minHeight: '120px',
                minWidth: 0, /* 긴 공고 제목이 열 너비를 밀어내지 않도록 */
                overflow: 'hidden',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.5rem',
                background: isToday ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderColor: isToday ? 'var(--primary-color)' : 'var(--border)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: isToday ? 'var(--primary-color)' : 'inherit' }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {events.slice(0, 4).map(event => (
                    <Link key={event.id} href={`/detail/${event.id}`}>
                      <div className="calendar-event-tag" style={{ 
                        fontSize: '0.75rem', 
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
                        color: '#fca5a5',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }} title={event.title}>
                        마감: {event.title}
                      </div>
                    </Link>
                  ))}
                  {events.length > 4 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', paddingLeft: '0.25rem' }}>
                      외 {events.length - 4}건 마감
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

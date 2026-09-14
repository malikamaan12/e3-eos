import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal } from '../components/DesignSystem.js';

interface CalendarEvent {
  id: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  title: string;
  type: 'move_in' | 'rehearsal' | 'show' | 'bump_out';
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  venue: string;
  hall: string;
  lead: string;
  status: 'confirmed' | 'in_progress' | 'scheduled';
  description: string;
}

const CANONICAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-01',
    projectId: 'PRJ-QND-2026',
    projectCode: 'PRJ-QND-2026',
    projectTitle: 'Qatar National Day 2026 Ceremonial Pavilion',
    title: 'Kinetic Truss Rigging & Primary Structural Load-in',
    type: 'move_in',
    date: '2026-09-14',
    startTime: '06:00',
    endTime: '18:00',
    venue: 'Doha Exhibition & Convention Center',
    hall: 'Halls 1 & 2',
    lead: 'Karim Haddad (Tech Director)',
    status: 'in_progress',
    description: 'Heavy structural truss assembly, 16x D8+ motor hoisting, and laser leveling.',
  },
  {
    id: 'evt-02',
    projectId: 'PRJ-QND-2026',
    projectCode: 'PRJ-QND-2026',
    projectTitle: 'Qatar National Day 2026 Ceremonial Pavilion',
    title: 'LED Canvas Calibration & AV Network Patching',
    type: 'move_in',
    date: '2026-09-18',
    startTime: '08:00',
    endTime: '20:00',
    venue: 'Doha Exhibition & Convention Center',
    hall: 'Main Pavilion Hall',
    lead: 'Salem Al-Marri (AV Lead)',
    status: 'scheduled',
    description: 'Unilumin 2.6mm LED wall tile installation, fiber transceiver testing, pixel mapping.',
  },
  {
    id: 'evt-03',
    projectId: 'PRJ-QND-2026',
    projectCode: 'PRJ-QND-2026',
    projectTitle: 'Qatar National Day 2026 Ceremonial Pavilion',
    title: 'Orchestral Soundcheck & Timecode Sync Rehearsal',
    type: 'rehearsal',
    date: '2026-09-22',
    startTime: '14:00',
    endTime: '22:00',
    venue: 'Doha Exhibition & Convention Center',
    hall: 'Al Mayassa Theater',
    lead: 'Nasser Al-Attiyah (Show Director)',
    status: 'scheduled',
    description: 'Full SMPTE timecode rehearsal with ceremonial brass orchestra and lighting choreography.',
  },
  {
    id: 'evt-04',
    projectId: 'PRJ-2026-DEMO',
    projectCode: 'PRJ-2026-DEMO',
    projectTitle: 'Qatar Tourism Demo Tender',
    title: 'Tourism Expo Booth Move-in & Carpentry Setup',
    type: 'move_in',
    date: '2026-09-24',
    startTime: '07:00',
    endTime: '19:00',
    venue: 'Katara Cultural Village',
    hall: 'Building 16 Amphitheater',
    lead: 'Zaid Mansour (Lead PM)',
    status: 'confirmed',
    description: 'Custom acoustic timber arch installation, client VIP lounge furniture placement.',
  },
  {
    id: 'evt-05',
    projectId: 'PRJ-QND-2026',
    projectCode: 'PRJ-QND-2026',
    projectTitle: 'Qatar National Day 2026 Ceremonial Pavilion',
    title: 'Live Ceremonial Opening & State VIP Reception',
    type: 'show',
    date: '2026-09-26',
    startTime: '16:00',
    endTime: '23:30',
    venue: 'Doha Exhibition & Convention Center',
    hall: 'Royal Pavilion Grand Hall',
    lead: 'Hamad Al-Kuwari (Executive Director)',
    status: 'confirmed',
    description: 'State dignitaries reception, live national broadcast, ceremonial flag raising.',
  },
  {
    id: 'evt-06',
    projectId: 'PRJ-2026-DEMO',
    projectCode: 'PRJ-2026-DEMO',
    projectTitle: 'Qatar Tourism Demo Tender',
    title: 'Public Tourism Showcase & Cultural Performance',
    type: 'show',
    date: '2026-09-27',
    startTime: '10:00',
    endTime: '22:00',
    venue: 'Katara Cultural Village',
    hall: 'Main Plaza',
    lead: 'Zaid Mansour (Lead PM)',
    status: 'scheduled',
    description: 'Public cultural dance shows, VR heritage tours, client sponsor activations.',
  },
  {
    id: 'evt-07',
    projectId: 'PRJ-QND-2026',
    projectCode: 'PRJ-QND-2026',
    projectTitle: 'Qatar National Day 2026 Ceremonial Pavilion',
    title: 'Controlled Bump-out, Rigging Strike & Warehouse Return',
    type: 'bump_out',
    date: '2026-09-29',
    startTime: '04:00',
    endTime: '23:00',
    venue: 'Doha Exhibition & Convention Center',
    hall: 'All Zones',
    lead: 'Hamad Al-Khelaifi (Logistics Lead)',
    status: 'scheduled',
    description: 'Reverse logistics dispatch, electronic asset barcoding, venue condition sign-off.',
  },
];

export const MasterCalendarView: React.FC = () => {
  const { currentLanguage, navigate } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'agenda';
    }
    return 'month';
  });

  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(3); // Default Week 3 (Sep 14-20)

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Operational Window: September 2026
  const monthName = isRtl ? 'سبتمبر ٢٠٢٦' : 'September 2026';
  const daysInMonth = 30;
  const firstDayWeekday = 2; // Tuesday (0=Sun, 1=Mon, 2=Tue)

  const filteredEvents = CANONICAL_EVENTS.filter((evt) => {
    if (selectedVenue !== 'all' && !evt.venue.toLowerCase().includes(selectedVenue.toLowerCase())) {
      return false;
    }
    if (selectedType !== 'all' && evt.type !== selectedType) {
      return false;
    }
    return true;
  });

  const getDayEvents = (dayNum: number) => {
    const dayStr = `2026-09-${dayNum.toString().padStart(2, '0')}`;
    return filteredEvents.filter((e) => e.date === dayStr);
  };

  const getTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'move_in':
        return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6', label: isRtl ? 'تركيب وبناء' : 'Move-in & Rigging' };
      case 'rehearsal':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b', label: isRtl ? 'بروفات وتجارب' : 'Rehearsal' };
      case 'show':
        return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', dot: '#10b981', label: isRtl ? 'عرض مباشر' : 'Live Show' };
      case 'bump_out':
        return { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff', dot: '#a855f7', label: isRtl ? 'تفكيك وإرجاع' : 'Bump-out & Strike' };
    }
  };

  const weekdays = isRtl
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weeksList = [
    { num: 1, label: isRtl ? 'الأسبوع ١ (١ - ٦ سبتمبر)' : 'Week 1 (Sep 1–6)', days: [1, 2, 3, 4, 5, 6] },
    { num: 2, label: isRtl ? 'الأسبوع ٢ (٧ - ١٣ سبتمبر)' : 'Week 2 (Sep 7–13)', days: [7, 8, 9, 10, 11, 12, 13] },
    { num: 3, label: isRtl ? 'الأسبوع ٣ (١٤ - ٢٠ سبتمبر)' : 'Week 3 (Sep 14–20)', days: [14, 15, 16, 17, 18, 19, 20] },
    { num: 4, label: isRtl ? 'الأسبوع ٤ (٢١ - ٢٧ سبتمبر)' : 'Week 4 (Sep 21–27)', days: [21, 22, 23, 24, 25, 26, 27] },
    { num: 5, label: isRtl ? 'الأسبوع ٥ (٢٨ - ٣٠ سبتمبر)' : 'Week 5 (Sep 28–30)', days: [28, 29, 30] },
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {isRtl ? 'التقويم الرئيسي وجدول التسليم الميداني' : 'Master Calendar & Delivery Schedule'}
            </h1>
            <Badge variant="primary">{isRtl ? 'عمليات سبتمبر ٢٠٢٦' : 'September 2026 Ops'}</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {isRtl
              ? 'الجدول الزمني الموحد لجميع مشاريع الفعاليات: أوقات التركيب، البروفات، العروض المباشرة، ومواعيد التفكيك.'
              : 'Unified event delivery schedule tracking load-in, rehearsals, live operational windows, and venue handovers.'}
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
            <button
              id="btn-calendar-view-month"
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: viewMode === 'month' ? 700 : 500,
                backgroundColor: viewMode === 'month' ? '#ffffff' : 'transparent',
                color: viewMode === 'month' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: viewMode === 'month' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                minHeight: '36px',
              }}
            >
              📅 {isRtl ? 'عرض الشهر' : 'Month'}
            </button>
            <button
              id="btn-calendar-view-week"
              onClick={() => setViewMode('week')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: viewMode === 'week' ? 700 : 500,
                backgroundColor: viewMode === 'week' ? '#ffffff' : 'transparent',
                color: viewMode === 'week' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: viewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                minHeight: '36px',
              }}
            >
              📆 {isRtl ? 'عرض الأسبوع' : 'Week'}
            </button>
            <button
              id="btn-calendar-view-agenda"
              onClick={() => setViewMode('agenda')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: viewMode === 'agenda' ? 700 : 500,
                backgroundColor: viewMode === 'agenda' ? '#ffffff' : 'transparent',
                color: viewMode === 'agenda' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: viewMode === 'agenda' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                minHeight: '36px',
              }}
            >
              📋 {isRtl ? 'جدول الأعمال' : 'Agenda'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Headline Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <MetricCard
          title={isRtl ? 'إجمالي المحطات المجدولة' : 'Scheduled Milestone Cues'}
          label={isRtl ? 'إجمالي المحطات المجدولة' : 'Scheduled Milestone Cues'}
          value={filteredEvents.length}
          subtitle={isRtl ? 'عبر جميع الأماكن في الدوحة' : 'Active production deliveries'}
          accentColor="#2563eb"
        />
        <MetricCard
          title={isRtl ? 'مراحل التركيب والبناء' : 'Move-In / Rigging'}
          label={isRtl ? 'مراحل التركيب والبناء' : 'Move-In / Rigging'}
          value={filteredEvents.filter((e) => e.type === 'move_in').length}
          subtitle={isRtl ? 'تشمل هياكل المسارح والـ LED' : 'Kinetic truss & AV setup'}
          accentColor="#3b82f6"
        />
        <MetricCard
          title={isRtl ? 'البروفات والعروض الحية' : 'Rehearsal & Live Shows'}
          label={isRtl ? 'البروفات والعروض الحية' : 'Rehearsal & Live Shows'}
          value={filteredEvents.filter((e) => e.type === 'rehearsal' || e.type === 'show').length}
          subtitle={isRtl ? 'العرض الوطني وجولات الواقع الافتراضي' : 'Ceremonial state events'}
          badge={{ label: isRtl ? 'المسار الحرج' : 'Critical Path', variant: 'success' }}
          accentColor="#10b981"
        />
        <MetricCard
          title={isRtl ? 'التفكيك والإرجاع المخزني' : 'Bump-out & Handover'}
          label={isRtl ? 'التفكيك والإرجاع المخزني' : 'Bump-out & Handover'}
          value={filteredEvents.filter((e) => e.type === 'bump_out').length}
          subtitle={isRtl ? 'تسليم الأماكن وإرجاع الأصول' : 'Venue strike & reverse logistics'}
          accentColor="#8b5cf6"
        />
      </div>

      {/* Filters Strip */}
      <Card style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              {isRtl ? 'تصفية حسب المكان:' : 'Filter by Venue:'}
            </span>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
              }}
            >
              <option value="all">{isRtl ? 'جميع الأماكن (الدوحة)' : 'All Venues (Doha)'}</option>
              <option value="Exhibition">{isRtl ? 'مركز الدوحة للمعارض والمؤتمرات (DECC)' : 'Doha Exhibition & Convention Center'}</option>
              <option value="Katara">{isRtl ? 'قرية كتارا الثقافية' : 'Katara Cultural Village'}</option>
              <option value="Lusail">{isRtl ? 'مارينا لوسيل' : 'Lusail Marina'}</option>
            </select>

            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginInlineStart: '12px' }}>
              {isRtl ? 'نوع العملية:' : 'Operation Type:'}
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
              }}
            >
              <option value="all">{isRtl ? 'جميع المراحل' : 'All Phases'}</option>
              <option value="move_in">{isRtl ? 'تركيب وبناء (Move-in)' : 'Move-in & Rigging'}</option>
              <option value="rehearsal">{isRtl ? 'بروفات وتجارب (Rehearsal)' : 'Rehearsals'}</option>
              <option value="show">{isRtl ? 'عرض مباشر (Live Show)' : 'Live Show'}</option>
              <option value="bump_out">{isRtl ? 'تفكيك وإرجاع (Bump-out)' : 'Bump-out & Teardown'}</option>
            </select>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
              {isRtl ? 'تركيب' : 'Move-in'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              {isRtl ? 'بروفات' : 'Rehearsal'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              {isRtl ? 'عرض حي' : 'Show'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a855f7' }} />
              {isRtl ? 'تفكيك' : 'Bump-out'}
            </span>
          </div>
        </div>
      </Card>

      {/* VIEW MODE 1: Month Grid */}
      {viewMode === 'month' && (
        <Card style={{ padding: '16px' }} noPadding>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {monthName}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {isRtl ? 'انقر على أي حدث لمعاينة التفاصيل الفنية' : 'Click on any event chip to view operational details'}
            </div>
          </div>

          {isMobile && (
            <div style={{ margin: '12px 16px 0', padding: '8px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>💡 {isRtl ? 'عرض جدول الأعمال (Agenda) مُحسّن لشاشات الجوال بدون ضغط للخلايا.' : 'Agenda view is optimized for mobile touchscreens with zero squashing.'}</span>
              <Button size="sm" variant="ghost" onClick={() => setViewMode('agenda')} style={{ fontSize: '11px', height: '28px' }}>
                {isRtl ? 'تبديل إلى جدول الأعمال' : 'Switch to Agenda'}
              </Button>
            </div>
          )}

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '760px' }}>
              {/* Days of Week Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                {weekdays.map((wd, i) => (
                  <div key={i} style={{ padding: '10px 4px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Month Calendar Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
                {Array.from({ length: firstDayWeekday }).map((_, i) => (
                  <div key={`blank-${i}`} style={{ minHeight: '110px', backgroundColor: '#fafbfc', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const evts = getDayEvents(dayNum);
                  const isToday = dayNum === 14;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      style={{
                        minHeight: '110px',
                        padding: '8px',
                        borderRight: '1px solid #f1f5f9',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isToday ? '#fffbeb' : '#ffffff',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isToday ? 800 : 600,
                            color: isToday ? '#d97706' : '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: isToday ? '#fef3c7' : 'transparent',
                          }}
                        >
                          {dayNum}
                        </span>
                        {evts.length > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                            {evts.length} {evts.length === 1 ? (isRtl ? 'فعالية' : 'item') : (isRtl ? 'فعاليات' : 'items')}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {evts.map((evt) => {
                          const col = getTypeColor(evt.type);
                          return (
                            <div
                              key={evt.id}
                              onClick={() => setSelectedEvent(evt)}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                backgroundColor: col.bg,
                                border: `1px solid ${col.border}`,
                                color: col.text,
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                lineHeight: 1.2,
                              }}
                              title={`${evt.startTime} - ${evt.title}`}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: col.dot, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {evt.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* VIEW MODE 2: Week View */}
      {viewMode === 'week' && (
        <Card noPadding>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {isRtl ? 'جدول تسليم الأسبوع' : 'Weekly Milestone View'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                {isRtl ? 'عرض مفصل لمحطات وأعمال الأسبوع الميدانية' : 'Operational breakdown by day for the selected delivery week'}
              </p>
            </div>

            {/* Week Selector Tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
              {weeksList.map((w) => {
                const isSelected = selectedWeek === w.num;
                return (
                  <button
                    key={w.num}
                    onClick={() => setSelectedWeek(w.num)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? '#0f172a' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minHeight: '36px',
                    }}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week Content */}
          {(() => {
            const currentWeekData = weeksList.find((w) => w.num === selectedWeek) || weeksList[2];

            if (isMobile) {
              // Mobile Stacked Days
              return (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {currentWeekData.days.map((dayNum) => {
                    const evts = getDayEvents(dayNum);
                    const isToday = dayNum === 14;
                    const dateObj = new Date(2026, 8, dayNum);
                    const dayOfWeekName = weekdays[dateObj.getDay()];

                    return (
                      <div
                        key={`m-day-${dayNum}`}
                        style={{
                          backgroundColor: isToday ? '#fffbeb' : '#ffffff',
                          border: `1px solid ${isToday ? '#fde68a' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: isToday ? '#d97706' : '#0f172a',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                              }}
                            >
                              {dayNum}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                              {dayOfWeekName}
                            </span>
                            {isToday && (
                              <Badge variant="warning">{isRtl ? 'اليوم' : 'Today'}</Badge>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            {evts.length} {evts.length === 1 ? (isRtl ? 'فعالية' : 'cue') : (isRtl ? 'فعاليات' : 'cues')}
                          </span>
                        </div>

                        {evts.length === 0 ? (
                          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                            {isRtl ? 'لا توجد فعاليات مجدولة لهذا اليوم' : 'No operational deliveries scheduled for this day.'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {evts.map((evt) => {
                              const col = getTypeColor(evt.type);
                              return (
                                <div
                                  key={evt.id}
                                  onClick={() => setSelectedEvent(evt)}
                                  style={{
                                    backgroundColor: col.bg,
                                    border: `1px solid ${col.border}`,
                                    borderRadius: '6px',
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: col.text }}>
                                      {evt.title}
                                    </span>
                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: col.text, whiteSpace: 'nowrap' }}>
                                      {evt.startTime} - {evt.endTime}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>📍 {evt.venue} ({evt.hall})</span>
                                    <span style={{ fontWeight: 600 }}>👤 {evt.lead.split(' ')[0]}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Desktop 7-day Column Grid
            return (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ minWidth: '840px', display: 'grid', gridTemplateColumns: `repeat(${currentWeekData.days.length}, 1fr)`, borderBottom: '1px solid #e2e8f0' }}>
                  {currentWeekData.days.map((dayNum) => {
                    const evts = getDayEvents(dayNum);
                    const isToday = dayNum === 14;
                    const dateObj = new Date(2026, 8, dayNum);
                    const dayOfWeekName = weekdays[dateObj.getDay()];

                    return (
                      <div
                        key={`w-col-${dayNum}`}
                        style={{
                          minHeight: '260px',
                          padding: '12px 10px',
                          borderRight: '1px solid #e2e8f0',
                          backgroundColor: isToday ? '#fffbeb' : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ textAlign: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                            {dayOfWeekName}
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: isToday ? '#d97706' : '#f1f5f9',
                              color: isToday ? '#ffffff' : '#0f172a',
                              fontWeight: 800,
                              fontSize: '13px',
                              marginTop: '2px',
                            }}
                          >
                            {dayNum}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          {evts.map((evt) => {
                            const col = getTypeColor(evt.type);
                            return (
                              <div
                                key={evt.id}
                                onClick={() => setSelectedEvent(evt)}
                                style={{
                                  padding: '8px',
                                  borderRadius: '6px',
                                  backgroundColor: col.bg,
                                  border: `1px solid ${col.border}`,
                                  color: col.text,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.1s ease',
                                }}
                                title={`${evt.startTime} - ${evt.title}`}
                              >
                                <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '2px', color: col.text }}>
                                  {evt.startTime} – {evt.endTime}
                                </div>
                                <div style={{ fontWeight: 700, lineHeight: 1.3, marginBottom: '4px' }}>
                                  {evt.title}
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  📍 {evt.hall}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* VIEW MODE 3: Agenda View */}
      {viewMode === 'agenda' && (
        <Card title={isRtl ? 'جدول الأعمال والمحطات التنفيذية' : 'Milestones & Operational Agenda'} noPadding>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                {isRtl ? 'المحطات المجدولة لشهر سبتمبر ٢٠٢٦' : 'Chronological Agenda — September 2026'}
              </span>
              <span style={{ marginInlineStart: '8px', fontSize: '11px', color: '#64748b' }}>
                ({filteredEvents.length} {isRtl ? 'محطة مسجلة' : 'deliveries scheduled'})
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {isRtl ? 'مرتبة تصاعدياً حسب التوقيت الميداني' : 'Sorted chronologically by field window'}
            </div>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredEvents.map((evt) => {
              const col = getTypeColor(evt.type);
              return (
                <div
                  key={evt.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px', flex: 1 }}>
                    {/* Date pill */}
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        minWidth: isMobile ? 'auto' : '130px',
                        textAlign: isMobile ? 'start' : 'center',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {evt.date}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {evt.startTime} – {evt.endTime}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {evt.projectCode}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: col.bg,
                            border: `1px solid ${col.border}`,
                            color: col.text,
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: col.dot }} />
                          {col.label}
                        </span>
                        <Badge variant={evt.status === 'in_progress' ? 'warning' : 'success'}>
                          {evt.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {evt.title}
                      </h3>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#475569' }}>
                        <span>📍 {evt.venue} — <strong>{evt.hall}</strong></span>
                        <span>👤 {isRtl ? 'المسؤول:' : 'Lead:'} <strong>{evt.lead}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'center' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedEvent(evt)}
                      style={{ minHeight: '38px', minWidth: '100px' }}
                    >
                      {isRtl ? 'التفاصيل ←' : 'Details →'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={isRtl ? 'تفاصيل المهمة الميدانية' : 'Operational Milestone Details'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                {selectedEvent.projectCode}
              </span>
              <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {selectedEvent.title}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                {selectedEvent.projectTitle}
              </p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'التاريخ والوقت:' : 'Date & Schedule:'}</span>
                <strong style={{ color: '#0f172a' }}>{selectedEvent.date} ({selectedEvent.startTime} - {selectedEvent.endTime})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'المكان والقاعة:' : 'Venue & Hall:'}</span>
                <strong style={{ color: '#0f172a' }}>{selectedEvent.venue} ({selectedEvent.hall})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'المسؤول الميداني:' : 'Operational Lead:'}</span>
                <strong style={{ color: '#0f172a' }}>{selectedEvent.lead}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'حالة الاعتماد:' : 'Gate Status:'}</span>
                <Badge variant={selectedEvent.status === 'in_progress' ? 'warning' : 'success'}>
                  {selectedEvent.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                {isRtl ? 'نطاق العمل والإجراءات التشغيلية:' : 'Operational Scope & Actions:'}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                {selectedEvent.description}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedEvent(null);
                  navigate(`/projects/${selectedEvent.projectId}?tab=timeline`);
                }}
              >
                {isRtl ? 'عرض في جدول المشروع (Gantt) ←' : 'View in Project Gantt →'}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedEvent(null)}>
                {isRtl ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

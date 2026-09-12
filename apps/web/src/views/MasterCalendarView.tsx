import React, { useState } from 'react';
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

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: viewMode === 'grid' ? 700 : 500,
                backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              📅 {isRtl ? 'شبكة الشهر' : 'Month Grid'}
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: viewMode === 'timeline' ? 700 : 500,
                backgroundColor: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                color: viewMode === 'timeline' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: viewMode === 'timeline' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              📋 {isRtl ? 'المخطط الزمني' : 'Timeline Schedule'}
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
      {viewMode === 'grid' && (
        <Card style={{ padding: '16px' }} noPadding>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {monthName}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {isRtl ? 'انقر على أي حدث لمعاينة التفاصيل الفنية' : 'Click on any event chip to view operational details'}
            </div>
          </div>

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
              const isToday = dayNum === 13;

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
        </Card>
      )}

      {/* VIEW MODE 2: Timeline Schedule */}
      {viewMode === 'timeline' && (
        <Card title={isRtl ? 'قائمة الفعاليات والمحطات الزمنية' : 'Event Milestones Schedule'} noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'التاريخ والوقت' : 'Date & Window'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'العملية والمشروع' : 'Milestone & Project'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'المكان والقاعة' : 'Venue & Hall'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'المرحلة' : 'Phase'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'المسؤول' : 'Team Lead'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>{isRtl ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => {
                  const col = getTypeColor(evt.type);
                  return (
                    <tr key={evt.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{evt.date}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{evt.startTime} – {evt.endTime}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{evt.title}</div>
                        <div style={{ fontSize: '11px', color: '#2563eb', fontFamily: 'monospace' }}>
                          {evt.projectCode} • {evt.projectTitle}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#334155', fontWeight: 600 }}>{evt.venue}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{evt.hall}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
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
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', fontSize: '12px' }}>
                        {evt.lead}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Badge variant={evt.status === 'in_progress' ? 'warning' : 'success'}>
                          {evt.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedEvent(evt)}>
                          {isRtl ? 'تفاصيل' : 'Details'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

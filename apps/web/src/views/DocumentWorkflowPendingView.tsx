import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Card } from '../components/DesignSystem.js';
import './ProjectRecords.css';
export const DocumentWorkflowPendingView: React.FC = () => {
  const { currentLanguage, navigate } = useEosContext(); const ar = currentLanguage === 'ar';
  return <div className="records-page" dir={ar ? 'rtl' : 'ltr'}><Card><div className="records-empty"><div className="records-orb" aria-hidden="true">▧</div><h1>{ar ? 'تسليم الوثائق غير متاح بعد' : 'Document delivery is not available yet'}</h1><p>{ar ? 'يمكنك تسجيل مسودات الوثائق وبيانات مراجعاتها الآن. رفع الملفات والتحقق منها وتجميع حزم التسليم والمشاركة الخارجية لم تُفعّل بعد.' : 'You can register document drafts and revision metadata now. File upload, verification, submission assembly and external sharing are not enabled yet.'}</p><Button onClick={() => navigate('/documents/register')}>{ar ? 'فتح سجل الوثائق' : 'Open document register'}</Button></div></Card></div>;
};

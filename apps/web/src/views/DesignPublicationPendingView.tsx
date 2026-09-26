import React from 'react';
import {Card} from '../components/DesignSystem.js';
import {useEosContext} from '../context/EosContext.js';
export const DesignPublicationPendingView:React.FC=()=>{
  const {currentLanguage}=useEosContext(),ar=currentLanguage==='ar';
  return <Card><h1>{ar?'مراجعة التصاميم المنشورة':'Published design review'}</h1><p>{ar?'لا تتوفر في هذا المسار حالياً ملفات تصميم منشورة يمكن التحقق منها. يلزم إصدار مستند محفوظ ومراجعة معتمدة قبل نشره للعميل.':'Verified published design files are not available through this workflow yet. A retained file revision and authorized review are required before client publication.'}</p></Card>;
};

import React, { useState, useEffect } from 'react';
import { translateEnToPt } from '../services/translator';
import { AlertCircle } from 'lucide-react';

export default function AutoTranslate({ text, className = '' }) {
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    let isMounted = true;
    setLoading(true);
    
    translateEnToPt(text)
      .then(result => {
        if (isMounted) {
          setTranslated(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTranslated(text); // fallback to original
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [text]);

  if (!text) return null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-ink-200">{text}</span>
      <div className="flex flex-col">
        <span className={loading ? 'opacity-50 animate-pulse text-ink-400' : 'text-gold-300'}>
          {loading ? 'Traduzindo...' : translated}
        </span>
        {!loading && translated !== text && (
          <span className="flex items-center text-[10px] text-ink-500 mt-0.5 italic gap-1">
            <AlertCircle size={10} />
            Tradução automática, sem revisão
          </span>
        )}
      </div>
    </div>
  );
}

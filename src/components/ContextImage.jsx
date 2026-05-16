import React, { useState, useEffect } from 'react';

export default function ContextImage({ term }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!term) return;
    
    const fetchImage = async () => {
      setLoading(true);
      try {
        // Busca o sumário da página na Wikipedia pelo termo (ex: "water", "mountain")
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`
        );
        const data = await res.json();
        
        if (data.thumbnail && data.thumbnail.source) {
          setImageUrl(data.thumbnail.source);
        } else {
          setImageUrl(null);
        }
      } catch (err) {
        console.error("Erro ao buscar imagem da Wikipedia:", err);
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [term]);

  if (loading) {
    return <div className="w-full h-40 bg-white/5 rounded-lg border border-white/10 animate-pulse flex items-center justify-center text-xs text-ink-500">Buscando imagem...</div>;
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-40 bg-ink-800 rounded-lg border border-white/5 flex items-center justify-center text-center p-4">
        <p className="text-xs text-ink-500 italic">Sem imagem de contexto para "{term}"</p>
      </div>
    );
  }

  return (
    <div className="group relative">
      <img 
        src={imageUrl} 
        alt={term} 
        className="w-full h-40 object-cover rounded-lg border border-white/10 shadow-inner group-hover:opacity-80 transition-opacity"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-900 to-transparent p-2 rounded-b-lg">
        <p className="text-[10px] text-ink-400 truncate">Fonte: Wikipedia</p>
      </div>
    </div>
  );
}
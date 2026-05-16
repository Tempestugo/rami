import React, { useState, useEffect } from 'react';

export default function ContextImage({ keyword }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!keyword) return;

    setLoading(true);
    setError(false);
    
    // Extract first word context (eg: "sun / day" -> "sun")
    const searchWord = keyword.split(/[ /]+/)[0];

    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchWord)}&prop=pageimages&format=json&pithumbsize=200&origin=*`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const pages = data.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const thumbnail = pages[pageId]?.thumbnail?.source;
          if (thumbnail) {
            setImgUrl(thumbnail);
            setLoading(false);
            return;
          }
        }
        setError(true);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [keyword]);

  if (loading) {
    return <div className="w-[120px] h-[120px] rounded-xl bg-ink-800 animate-pulse flex-shrink-0" />;
  }

  if (error || !imgUrl) {
    return null; // Omit image block cleanly when error
  }

  return (
    <img src={imgUrl} alt={keyword} className="w-[120px] h-[120px] rounded-xl object-cover border border-white/10 flex-shrink-0" />
  );
}
import { useEffect } from 'react';

import { type MapMarker, mapHtml } from '@/lib/map-html';

export function VenueMap({ markers, onSelect }: { markers: MapMarker[]; onSelect: (id: string) => void }) {
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      try {
        const { venue } = JSON.parse(e.data);
        if (venue) onSelect(venue);
      } catch {}
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onSelect]);

  return <iframe title="Mapa" srcDoc={mapHtml(markers)} style={{ flex: 1, border: 0, width: '100%', height: '100%' }} />;
}

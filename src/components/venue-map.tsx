import { WebView } from 'react-native-webview';

import { type MapMarker, mapHtml } from '@/lib/map-html';

export function VenueMap({ markers, onSelect }: { markers: MapMarker[]; onSelect: (id: string) => void }) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: mapHtml(markers), baseUrl: 'https://vibein.app/' }}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      onMessage={(e) => {
        const { venue } = JSON.parse(e.nativeEvent.data);
        if (venue) onSelect(venue);
      }}
    />
  );
}

import { Colors } from '@/constants/theme';

export type MapMarker = { id: string; name: string; lat: number; lng: number; score: number | null; color: string };

const PANCEVO = { lat: 44.8708, lng: 20.6403 };

// A self-contained Leaflet page with OpenStreetMap tiles. Tapping a venue
// sends its id back to the app (React Native WebView or the web iframe).
export function mapHtml(markers: MapMarker[]) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{height:100%;margin:0;background:${Colors.background}}
.leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.85) saturate(.6)}
.pin{display:flex;align-items:center;justify-content:center;border-radius:50%;border:3px solid;background:${Colors.backgroundElement};color:${Colors.text};font:700 12px system-ui,sans-serif}
.leaflet-tooltip{background:${Colors.backgroundElement};color:${Colors.text};border:0;font:600 13px system-ui,sans-serif}
.leaflet-tooltip:before{display:none}
.leaflet-control-attribution{background:#0C1210cc!important;color:${Colors.textSecondary}}
.leaflet-control-attribution a{color:${Colors.textSecondary}}
</style></head><body><div id="map"></div><script>
var markers=${JSON.stringify(markers)};
var map=L.map('map',{zoomControl:false}).setView([${PANCEVO.lat},${PANCEVO.lng}],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
function send(id){var m=JSON.stringify({venue:id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else parent.postMessage(m,'*');}
markers.forEach(function(v){
  var hot=v.score!=null&&v.score>=4.2;
  var icon=L.divIcon({className:'',iconSize:[40,40],html:'<div class="pin" style="width:34px;height:34px;border-color:'+v.color+(hot?';box-shadow:0 0 16px '+v.color:'')+'">'+(v.score==null?'–':v.score.toFixed(1))+'</div>'});
  L.marker([v.lat,v.lng],{icon:icon,zIndexOffset:Math.round((v.score||0)*100)}).addTo(map).bindTooltip(v.name,{direction:'top',offset:[0,-18]}).on('click',function(){send(v.id)});
});
if(markers.length>1)map.fitBounds(markers.map(function(v){return[v.lat,v.lng]}),{padding:[50,50],maxZoom:16});
</script></body></html>`;
}

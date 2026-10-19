"""Turn an Overpass (OpenStreetMap) answer into a venue list for Pančevo.

Usage: python3 scripts/osm-venues.py overpass.json > supabase/osm-venues.csv
"""
import csv
import json
import sys

TYPES = {'nightclub': 'club', 'bar': 'club', 'pub': 'cafe', 'cafe': 'cafe', 'restaurant': 'restaurant',
         'fast_food': 'restaurant', 'stadium': 'stadium', 'events_venue': 'concert_venue', 'music_venue': 'concert_venue'}

# Serbian Cyrillic to Latin, so every name reads the same way in the app
CYR = dict(zip('абвгдђежзијклљмнњопрстћуфхцчџшАБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ',
               ['a','b','v','g','d','đ','e','ž','z','i','j','k','l','lj','m','n','nj','o','p','r','s','t','ć','u','f','h','c','č','dž','š',
                'A','B','V','G','D','Đ','E','Ž','Z','I','J','K','L','Lj','M','N','Nj','O','P','R','S','T','Ć','U','F','H','C','Č','Dž','Š']))


def latin(text):
    return ''.join(CYR.get(ch, ch) for ch in text)


rows = []
for el in json.load(open(sys.argv[1]))['elements']:
    tags = el.get('tags', {})
    name = tags.get('name')
    kind = tags.get('amenity') or tags.get('leisure')
    if not name or kind not in TYPES:
        continue
    lat = el.get('lat') or el.get('center', {}).get('lat')
    lon = el.get('lon') or el.get('center', {}).get('lon')
    street = ' '.join(x for x in [tags.get('addr:street'), tags.get('addr:housenumber')] if x)
    rows.append([latin(name), TYPES[kind], kind, f'{lat:.6f}', f'{lon:.6f}', latin(street), f"{el['type']}/{el['id']}"])

rows.sort(key=lambda r: (r[1], r[0].lower()))
w = csv.writer(sys.stdout)
w.writerow(['name', 'type', 'osm_kind', 'lat', 'lng', 'address', 'osm_id'])
w.writerows(rows)

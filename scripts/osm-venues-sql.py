"""Write the SQL that loads the reviewed OpenStreetMap venues into Supabase.

Usage: python3 scripts/osm-venues-sql.py supabase/osm-venues.csv > supabase/osm-venues.sql
Fast food is left out, as is the second "Espacio" (same place listed twice).
Safe to run more than once: a venue with the same name at the same spot is skipped.
"""
import csv
import sys

SKIP_KINDS = {'fast_food'}
SKIP_OSM_IDS = {'node/8341571126'}
# Names fixed by hand after users reported them
RENAMES = {'Publica Pub': 'Publika Pub'}


def q(text):
    return "'" + text.replace("'", "''") + "'" if text else 'null'


rows = [{**r, 'name': RENAMES.get(r['name'], r['name'])} for r in csv.DictReader(open(sys.argv[1])) if r['osm_kind'] not in SKIP_KINDS and r['osm_id'] not in SKIP_OSM_IDS]
print('-- VibeIN: prava mesta u Pančevu sa OpenStreetMap-a (%d mesta).' % len(rows))
print('-- Nalepi ceo tekst u Supabase SQL Editor i klikni Run. Može se pokrenuti više puta.')
print('begin;')
print("delete from venues where name like 'Test %' and owner_id is null;")
print('insert into venues (name, type, location, address)')
print('select v.name, v.type::venue_type, st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography, v.address from (values')
print(',\n'.join(f"  ({q(r['name'])}, {q(r['type'])}, {r['lat']}, {r['lng']}, {q(r['address'] + ', Pančevo' if r['address'] else '')})" for r in rows))
print(') as v(name, type, lat, lng, address)')
print('where not exists (select 1 from venues e where e.name = v.name and st_dwithin(e.location, st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography, 50));')
print('commit;')

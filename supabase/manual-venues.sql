-- VibeIN: mesta koja nema na OpenStreetMap-u, dodata ručno.
-- Nalepi ceo tekst u Supabase SQL Editor i klikni Run. Može se pokrenuti više puta.
insert into venues (name, type, location, address)
select v.name, v.type::venue_type, st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography, v.address from (values
  -- SC Mladost, between its two main football pitches (OSM way/68406503 and way/68406524)
  ('FK Železničar', 'stadium', 44.879920, 20.662230, 'SC Mladost, Makedonska bb, Pančevo')
) as v(name, type, lat, lng, address)
where not exists (select 1 from venues e where e.name = v.name and st_dwithin(e.location, st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography, 50));

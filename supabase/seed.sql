-- Test venues in Pančevo for local development only. Names and positions are
-- placeholders; replace them with real venues before launch.
insert into venues (name, type, location, address, description) values
  ('Test klub Centar', 'club', st_setsrid(st_makepoint(20.6403, 44.8708), 4326)::geography, 'Centar, Pančevo', 'Probni klub za razvoj.'),
  ('Test kafić Korzo', 'cafe', st_setsrid(st_makepoint(20.6420, 44.8722), 4326)::geography, 'Korzo, Pančevo', 'Probni kafić za razvoj.'),
  ('Test restoran Kej', 'restaurant', st_setsrid(st_makepoint(20.6355, 44.8690), 4326)::geography, 'Kej, Pančevo', 'Probni restoran za razvoj.'),
  ('Test stadion', 'stadium', st_setsrid(st_makepoint(20.6510, 44.8650), 4326)::geography, 'Pančevo', 'Probni stadion za razvoj.');

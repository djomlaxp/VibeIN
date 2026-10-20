-- Proving a venue is yours the way Google, Yelp and Facebook do it: the code
-- goes to the venue, not to the person asking, who then types it in the app.
--   phone:    the admin calls the venue's number and says the code
--   email:    the admin emails the code to an address on the venue's own domain
--   postcard: the admin mails a card with the code to the venue's address
--   video:    one unbroken clip recorded in the app: sign outside, inside, and
--             something only staff can do (unlock the door, open the till)
--   document: business registration, lease or utility bill
-- When the app already has the venue's phone or address, that one is used,
-- not whatever the person typed.

alter table venue_claims drop constraint if exists venue_claims_method_check;
-- Claims sent with the earlier methods stay as they are
alter table venue_claims add constraint venue_claims_method_check
  check (method in ('phone', 'email', 'postcard', 'video', 'document')) not valid;

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'claim-docs';

create or replace function create_venue_claim(
  p_venue_id uuid,
  p_method text,
  p_venue_link text default null,
  p_note text default null,
  p_document_path text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_venue venues%rowtype;
  v_link text := nullif(trim(p_venue_link), '');
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_venue from venues where id = p_venue_id;
  if not found then
    raise exception 'venue_not_found';
  end if;
  if v_venue.owner_id is not null then
    raise exception 'venue_has_owner';
  end if;
  if p_method not in ('phone', 'email', 'postcard', 'video', 'document') then
    raise exception 'invalid_method';
  end if;

  -- The venue's own phone and address win over what was typed
  if p_method = 'phone' then
    v_link := coalesce(nullif(trim(v_venue.contact ->> 'phone'), ''), v_link);
  elsif p_method = 'postcard' then
    v_link := coalesce(nullif(trim(v_venue.address), ''), v_link);
  elsif p_method = 'email' and v_link is not null
    and lower(split_part(v_link, '@', 2)) in ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'mail.ru', 'yandex.com') then
    raise exception 'email_not_business';
  end if;
  if p_method in ('phone', 'email', 'postcard') and v_link is null then
    raise exception 'venue_link_missing';
  end if;
  if p_method in ('video', 'document') and (p_document_path is null or split_part(p_document_path, '/', 1) <> v_uid::text) then
    raise exception 'document_missing';
  end if;

  insert into venue_claims (venue_id, user_id, proof, method, venue_link, secret_code, document_path)
  values (
    p_venue_id, v_uid, nullif(trim(p_note), ''), p_method, v_link,
    case when p_method in ('phone', 'email', 'postcard') then lpad((floor(random() * 1000000))::int::text, 6, '0') end,
    case when p_method in ('video', 'document') then p_document_path end
  ) returning id into v_id;
  return v_id;
end;
$$;

# VibeIN

Aplikacija koja pokazuje atmosferu uživo u klubovima, kafićima, restoranima, na koncertima i stadionima. Korisnici prijavljuju atmosferu (ocena, gužva, muzika, kratak video), a vlasnici objekata objavljuju promocije, najave i informacije.

Prvi grad: **Pančevo**. Jedan kod za iOS, Android i web (Expo + React Native), backend je Supabase.

## Pravila koja čuva baza

Sva pravila su u `supabase/migrations/` i važe bez obzira na aplikaciju:

- prijava je moguća samo na **manje od 100 m** od objekta;
- **jedna prijava po objektu na 15 minuta** po korisniku;
- video do **60 sekundi**, snima se samo kamerom u aplikaciji (nema izbora iz galerije);
- video se **briše posle 3 sata** (zakazani posao na svakih 15 min), osim ako ga vlasnik objekta **arhivira** na profilu;
- kada vlasnik arhivira snimak, autor dobija obaveštenje i može da ga povuče (tada se briše i ne može ponovo da se arhivira);
- vlasnik ne može da ocenjuje svoj objekat;
- GPS pozicija korisnika se ne vidi drugima.

## Pokretanje

1. Napravi projekat na [supabase.com](https://supabase.com) i u SQL editoru pokreni redom fajlove iz `supabase/migrations/`, pa `supabase/seed.sql` za probne objekte. (Ili sa Supabase CLI: `supabase link` pa `supabase db push`.)
2. Kopiraj `.env.example` u `.env` i upiši URL i anon ključ projekta.
3. `npm install`
4. `npm run web` za web, ili `npx expo run:android` / `npx expo run:ios` za telefon. Kamera i video zahtevaju development build, ne rade u Expo Go.

## Struktura

- `src/app/index.tsx` lista objekata sa vibe ocenom uživo i filterom po tipu
- `src/app/venue/[id].tsx` stranica objekta: vibe, poslednje prijave sa snimcima, promocije, arhiva snimaka
- `src/app/report/[id].tsx` prijava atmosfere sa snimanjem videa
- `src/app/notifications.tsx` obaveštenja (arhivirani snimci, povlačenje snimka)
- `src/app/login.tsx` prijava i registracija emailom
- `src/lib/` Supabase klijent, tipovi i zajednička pravila
- `supabase/migrations/` šema baze, pravila pristupa i funkcije

## Sledeće

Mapa, vlasnički deo (preuzimanje objekta, objave), Google i Apple prijava, moderacija, uvoz objekata za Pančevo.

# TechVault — predaja konteksta za nastavak rada

## Šta je ovo
Interna baza znanja ("TechVault", ranije "Orionteka") za tehničku dokumentaciju.
Kategorije/podkategorije, članci sa rich-text editorom, prilozi, pretraga, tri nivoa
korisnika (Admin/User/Guest), napomene na tekstu, log izmena.

## Tehnologije
- **TypeScript** svuda (frontend + backend, isti Next.js projekat)
- **Next.js 16.3.0** (App Router, Turbopack) — VAŽNO: ovo je nestandardna verzija.
  Pre pisanja koda koji koristi Next.js API-je, pročitaj
  `node_modules/next/dist/docs/` (vidi `AGENTS.md` u rootu projekta) jer se pravila
  razlikuju od onoga što je "poznato" iz trening podataka.
- **React 19.2.8**, **Prisma 6.19.3** + **PostgreSQL 17**, **NextAuth v5 (beta)**
- **Tailwind CSS v4** + **shadcn/ui na Base UI-ju** (NE Radix — koristi se
  `render={<X/>}` umesto `asChild`, native `onClick` umesto `onSelect`)
- **Tiptap v3** editor sa nizom zvaničnih i custom ekstenzija (tabele, boje,
  highlight, text-align, resizable/alignable slike sa captionom, napomene na tekstu)

## Struktura projekta
- Windows mašina, dev radi kroz `D:\Cloude_project`, produkcioni server se pokreće
  kroz `start.cmd` (restart-loop cmd prozor), port 3000, izložen i van LAN-a preko
  Cloudflare quick tunnel-a (`cloudflared tunnel --url http://localhost:3000`).
- Svaka DB izmena ide kroz ručno pisanu SQL migraciju u
  `prisma/migrations/<timestamp>_<name>/migration.sql`, pa
  `npx prisma migrate deploy` + `npx prisma generate`.
- Plan rada (originalna specifikacija podeljena u faze A–H) je u
  `C:\Users\sandr\.claude\plans\recursive-tickling-lynx.md`.

## Šta je već urađeno (sve faze A–H su ZAVRŠENE)
- Faza A: vizuelne izmene (pretraga centrirana, vertikalna lista podkategorija,
  responsive font, Excel-stil tabele, text-align)
- Faza B: pretraga po delu reči (substring/trigram), popularne pretrage, filteri
- Faza C: tagovi sa autocomplete i klikabilnom destinacijom
- Faza D: napomene na tekstu — Admin ima precizno obeležavanje selekcije, User
  (ne Guest) može da ostavlja napomene na paragrafima bez write pristupa, sve
  se loguje (pun sadržaj, ne samo diff) u `NoteAuditLog`, log vidi SAMO admin
  na `/admin/log`
- Faza E: bogato formatiranje — boja teksta/highlight/pozadina bloka, prošireni
  emoji + custom admin emoji, boja ikonice priloga I članka, tabela sa biranjem
  broj redova/kolona + paste iz Excela, slika sa poravnanjem i captionom
- Faza F: tri nivoa korisnika (Admin/User/Guest) sa read dozvolama po kategoriji
  i `guestVisible` flagom
- Faza G: live update (polling refresh) na listama
- Faza H: finalna provera — bez grešaka u konzoli, regresija OK

## Rebrending (Orionteka → TechVault) — ZAVRŠENO
- Novi logo (`src/assets/logo.png`, transparentna pozadina, hromakej urađen
  preko `sharp` da ukloni tamnoplavu pozadinu originala) i favicon
  (`src/app/icon.png`) uvezeni kao STATIC IMPORT (`import logo from
  "@/assets/logo.png"`), ne kao fajl u `public/` — ovo je namerno, jer Next.js
  Image Optimizer i browser cache inače servira STARU sliku posle zamene fajla
  pod istim imenom (proveren, stvaran bag). Static import forsira content-hash
  u URL-u, pa se ovaj problem više ne može desiti.
- Naziv "TechVault" (Tech belo, Vault plavo/sky-400 da se slaže sa logoom) je
  svuda u layoutu/headeru/login stranici.
- Dark mode pozadina je čisto crna (`oklch(0 0 0)`), light mode čisto bela.

## ŠTA KORISNIK EKSPLICITNO NE ŽELI (bitno za buduće promptove!)
1. **Logo na početnoj (homepage) stranici SAMO u headeru, gore levo — nigde
   više.** Korisnik je prvo tražio "centriran logo na početnoj", pa se
   PREDOMISLIO i eksplicitno vratio ovu odluku — centrirani logo ide SAMO na
   login stranicu (koja ga je i pre imala), a homepage NE SME imati nikakav
   hero/centrirani logo blok u telu stranice.
2. **Guest korisnici ne smeju da ostavljaju napomene** — samo prijavljeni
   User i Admin (Guest je izričito blokiran u server akcijama).
3. **Log izmena napomena vidi ISKLJUČIVO admin** — ne User, ne Guest.
4. **Log mora sadržati pun tekst napomene**, ne samo da/ne indikator izmene.
5. Ne diraj `public/logo.png` pristup za slike koje se menjaju — koristi
   static import iz `src/assets/`, inače se vraća cache bag.
6. Ne koristi Radix API pretpostavke (`asChild`, `onSelect`) — ovo je Base UI.

## Na šta obratiti pažnju (tehničke zamke otkrivene u ovoj sesiji)
- **CardHeader (shadcn/ui) je CSS `grid`, ne `flex`** — `items-center` ga NEĆE
  horizontalno centrirati, treba `justify-items-center`. Ovo je bio stvaran
  bag na login stranici (logo se nije centrirao) i tako je i ispravljen.
- **Custom Tiptap NodeView mora biti eksplicitno povezan kroz
  `addNodeView() { return ReactNodeViewRenderer(MyView) }`** unutar
  `Extension.extend({...})`. Otkriven je stvaran bag: `ResizableImageView`
  (dugmad za poravnanje slike, caption, resize) je bila potpuno napisana ali
  NIKAD povezana — slike su se renderovale samo kroz statični `renderHTML`,
  bez ikakve interaktivnosti, za SVE korisnike. Uvek proveri da li je
  `addNodeView` prisutan kad praviš custom Tiptap node view.
- `@tiptap/extension-text-style` nema default export u ovoj verziji — koristi
  named import: `import { TextStyle } from "@tiptap/extension-text-style"`.
- Native `<input type="color">` i `<input type="file">` se ne mogu otvoriti
  pravim OS dijalogom kroz automatizovani JS. Za testiranje: koristi native
  setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,
  'value').set`) + `dispatchEvent(new Event('input', {bubbles:true}))` za
  color input; za file input napravi pravi `File` objekat (npr. iz canvas
  blob-a) i dodeli ga preko `DataTransfer` + `dispatchEvent('change')`.
- React state se ne flush-uje odmah u istom sinhronom JS pozivu — klik i
  provera moraju biti u ODVOJENIM pozivima (ili sačekati
  `requestAnimationFrame`/`setTimeout`), inače provera lažno pokazuje da
  nešto nije radilo.
- ProseMirror-ova CSS klasa `ProseMirror-selectednode` može biti prisutna a da
  React `selected` prop u node view-u NIJE tačan indikator da je NodeView
  uopšte povezan — proveri stvarni DOM (`data-node-view-wrapper` atribut) pre
  zaključka da je nešto "React timing bag" a ne stvaran nedostatak wiring-a.
- Windows: PATH mora da uključi `/c/Program Files/nodejs` u svakom Bash pozivu;
  `taskkill //F //T //PID <pid>` (dupli slash, ne jednostruki); za proveru
  porta koristi `netstat -ano | findstr '3000.*LISTENING'` (NE PowerShell
  `Select-String` sa `\s` — pokazano da nepouzdano vraća lažno-negativne
  rezultate u ovom okruženju); `prisma generate` posle svake migracije zahteva
  prvo ubijanje node procesa koji drži server (EPERM na DLL fajlu) pa tek onda
  generate.
- Uvek posle DB/koda izmene: `npm run build` → restart produkcionog servera
  (kill trenutni PID na portu 3000, sačekaj da `start.cmd` loop podigne nov) →
  vizuelna provera u browseru pre javljanja da je gotovo.
- Posle testiranja kroz UI na PRAVIM podacima (ne test nalog), obavezno ukloni
  test sadržaj (test slike, test boje, test tabele) iz stvarnih članaka pre
  završetka — ovaj projekat ima realne korisnike (Sandra, Nikola i dr.) koji
  aktivno unose sadržaj uporedo sa razvojem.

## Trenutno stanje
Sve gorenavedene faze su implementirane, testirane uživo u browseru i
sačuvane. Nema poznatih otvorenih bagova. Sledeći koraci zavise od novih
zahteva korisnika — nema pending zadataka iz specifikacije.

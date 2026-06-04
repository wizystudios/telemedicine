
# Build plan — "Reality + Trust" pass

Shipped in 4 waves. After each wave I stop, you verify, then I move on.

---

## Wave 1 — Database & storage foundation (one migration)

Adds the columns and buckets every later wave needs.

- `hospitals`, `pharmacies`, `laboratories`, `polyclinics`: add `latitude double precision`, `longitude double precision` (nullable). Used for real Haversine distance on the map.
- `chat_messages`: add `attachment_url text`, `attachment_type text` (image/video/audio/file), `attachment_name text`, `attachment_size int`.
- New storage bucket `chat-attachments` (private), RLS scoped to the two participants of the appointment.
- New storage bucket `legal-documents` (public, read-only) for signed Terms / Privacy PDFs.
- Add `accepted_terms_at`, `accepted_privacy_at`, `data_export_requested_at`, `data_deletion_requested_at` to `profiles` (PDPA / GDPR rights of access + erasure).
- New table `consent_log` (user_id, doc_type, version, accepted_at, ip, user_agent) so we can prove consent — required by PDPA TZ + GDPR Art. 7.
- RPC `dashboard_timeseries(org_type, org_id, days)` returning daily counts of visits / appointments / orders for charts.

## Wave 2 — Real map + verified doctor clarity

- Install `leaflet` + `react-leaflet`. Replace `NearbyMap.tsx` mock SVG with a real OpenStreetMap tile layer. No API key needed.
- Get user geolocation, compute real km with Haversine, sort by distance.
- New owner-side "Edit location" picker (click map to drop a pin) inside each org dashboard so coordinates fill in.
- `DoctorCard` + `DoctorsList`: show **all** doctors, but only admin-approved ones get the green verified tick + "Imeidhinishwa" badge; unverified ones get a muted "Inasubiri uthibitisho" chip and a tooltip explaining they're not yet vetted.

## Wave 3 — Chat media + real-time dashboards + Wizy upgrade + Soko redesign

- **Chat media**: `MobileChatInterface` and the message renderer wired to upload image/video/document/audio into `chat-attachments`, store signed URL in `chat_messages.attachment_url`, render inline previews (image, video player, file chip with download, audio waveform-style player).
- **Real-time dashboards**: new `<LiveAnalytics />` component using Recharts (line + bar). Drops into Admin, Doctor, Hospital, Polyclinic, Pharmacy, Lab dashboards. Subscribes to relevant Supabase channels (`appointments`, `pharmacy_orders`, `lab_bookings`, `profile_visits`) and refetches `dashboard_timeseries` on changes.
- **Wizy upgrade**: extend `wizy-agent` edge function tools:
  - `get_my_appointments`, `cancel_appointment`, `reschedule_request`
  - `get_my_prescriptions`, `get_my_lab_results`, `get_my_medical_records`
  - `set_medication_reminder`, `list_reminders`
  - `book_lab_test`, `order_medicine` (already exists, expanded)
  - `summarize_health` (reads patient_profile + recent records)
  - All gated by `auth.uid()` so Wizy can only act on the logged-in user's data.
- **Soko redesign**: rebuild Marketplace with a clean grid — hero search, category chips, product cards with image, price, pharmacy badge, "Ongeza kwenye Mkoba" button, sticky cart bar. Pure-health rounded-3xl aesthetic.

## Wave 4 — Legal + Security hardening

- New routes `/terms` (Masharti ya Matumizi) and `/privacy` (Sera ya Faragha), bilingual SW/EN, written to align with:
  - **Tanzania Personal Data Protection Act, 2022** (lawful basis, data subject rights, cross-border transfer, breach notification 72h, controller = TeleMed).
  - **GDPR** (Art. 5 principles, Art. 6 lawful basis, Art. 13 information, Art. 15–22 rights, Art. 33 breach).
  - Sections: who we are, data we collect, purposes, lawful basis, sharing (doctors/pharmacies/labs only as required), retention, rights (access, rectification, erasure, portability, objection), security measures, children, cookies, contact DPO, governing law (TZ), updates.
- Consent gate on registration: must tick "Nimekubali Masharti na Sera ya Faragha" → writes to `consent_log` + `profiles.accepted_*_at`.
- "Pakua data yangu" (export) and "Futa akaunti yangu" (erasure) buttons in Profile → write to `data_export_requested_at` / `data_deletion_requested_at` (admin sees them in super-admin queue).
- Security memory updated to document:
  - Encryption at rest: AES-256 (Supabase Postgres default).
  - Encryption in transit: TLS 1.2+ everywhere (Supabase + Lovable CDN).
  - Storage buckets `chat-attachments`, `org-documents` are private with RLS — signed URLs only, never public.
  - Service-role key is server-only; client uses anon key (publishable).
  - RLS forces every health record / chat / order to be readable only by patient + treating doctor + super admin.
- Run security scan after migration; fix any new findings.

---

## Technical notes

- Map: `react-leaflet@4` + `leaflet@1.9`; tiles `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`; attribution `© OpenStreetMap contributors` (required by ODbL).
- Distance: Haversine in `src/lib/geo.ts`, returns km to 1 decimal.
- Chat upload: max 25 MB; mime allowlist; thumbnails generated client-side for images via `URL.createObjectURL` while uploading.
- Charts: `recharts` (already in stack). Realtime via existing `supabase.channel()`.
- No new secrets needed. No payment / video-call work (still excluded per memory).
- Hacker question: I cannot guarantee "uncrackable" — but PDPA-grade controls (encryption + RLS + signed URLs + audit logs + private buckets) put us at the standard expected of regulated health apps. Documented honestly in the Privacy Policy.

Reply **continue** to start Wave 1 (migration).

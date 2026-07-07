You listed five distinct problems. Doing them in one turn without a plan will produce shallow work — I want to fix them properly. Approve this and I ship it end to end without stopping.

## 1. Fix "not found" after doctor signs up

**Root cause:** In `src/pages/Auth.tsx` the flow calls `navigate('/dashboard')` immediately after `signUp`. When email confirmation is ON, `signUp` returns no session, so the user hits `/auth` again (looks like "not found"). When it succeeds, `user_roles.insert` runs from the browser but RLS blocks anon inserts, so the role never lands, and `RoleBasedDashboard` falls back to `patient` even for a doctor.

**Fix:**
- Wait for `data.session` before navigating; if no session, show "Angalia email yako kuthibitisha akaunti".
- Move the `user_roles` insert into a Postgres trigger on `auth.users` that reads `raw_user_meta_data.role` (so RLS can't block it and the role is guaranteed).
- Backfill: for any existing user missing a `user_roles` row, insert one from `profiles.role`.

## 2. Fix hospital / pharmacy / lab pages from the patient account

Investigation shows the profile pages themselves work — but the patient never reaches them because:
- `PatientHome` "Hospitali" and "Maabara" tiles point to `/nearby?type=...`, and `NearbyPlaces` only lists rows where geolocation matches — with no verified rows nearby, the patient sees an empty screen and thinks it's broken.
- "Famasi" points to `/marketplace`, which is medicines, not pharmacies.

**Fix:**
- Retarget the tiles to real browse pages: `/hospitals`, `/pharmacies`, `/laboratories` (new lightweight list pages, same pattern as `DoctorsList`, showing every verified institution with a card that links into the existing profile page).
- Keep `/nearby` reachable from a "Karibu nawe" chip on those list pages.

## 3. Move the calendar off Patient Home, onto Doctors page (left side)

- Remove the "Waliopo Leo" tile from `PatientHome`.
- On `/doctors-list`, add a two-column layout on ≥md screens: left column is a date picker + hour filter; right column is the doctor grid filtered to doctors with `doctor_availability` slots on that date. On mobile it collapses to a compact date strip above the list.
- Each doctor card shows the hospital/organization they work at, plus their available hours for the selected date.

## 4. Simplify the Super Admin dashboard

You said the admin is confusing. I will restructure `SuperAdminDashboard` so the first thing an admin sees is **Sajili** (register) actions, not tables of doctors and orgs:

```text
Tab 1: Sajili
  - Sajili Mtumiaji (patient)
  - Sajili Daktari
  - Sajili Hospitali / Polyclinic / Famasi / Maabara
Tab 2: Idhinisha (pending approvals only)
Tab 3: Takwimu (stats)
Tab 4: Angalia Data (the current tables, hidden behind one click)
```

No more landing on a wall of doctor cards.

## 5. Wave C — Org owner live dashboard

For `HospitalOwnerDashboard`, `PharmacyOwnerDashboard`, `LabOwnerDashboard`, `PolyclinicOwnerDashboard`:
- Status filter chips: Zote / Inasubiri / Imekubaliwa / Imekamilika / Imesitishwa.
- Time range toggle: Leo / Wiki 7 / Siku 30.
- Supabase Realtime subscription on `appointments`, `pharmacy_orders`, `lab_bookings`, `org_ads` so counters and lists refresh live.
- "Ads" section shows Active / Paused / Expired with one-tap pause/resume.

## 6. Wave D — Guided doctor journey UI

New `DoctorJourneyStepper` component embedded in `DoctorDashboard` for each in-progress patient:

```text
1 Ombi la miadi   →   Kubali / Kataa
2 Mazungumzo      →   Fungua chat / simu
3 Andika dawa     →   PrescriptionWriter
4 Kamilisha       →   Mark complete + prompt review
```

Each step is a real button that advances `appointments.status` and opens the right existing component (chat, `PrescriptionWriter`, review dialog).

## Technical details (database)

- Trigger `handle_new_user_role`: on `auth.users` insert, `insert into public.user_roles(user_id, role) values (new.id, coalesce(new.raw_user_meta_data->>'role','patient')::app_role) on conflict do nothing`.
- Backfill missing `user_roles` rows from `profiles.role`.
- Enable realtime on `appointments`, `pharmacy_orders`, `lab_bookings`, `org_ads` if not already in the publication.
- No new tables needed.

## Files touched (approx)

- New: `src/pages/HospitalsList.tsx`, `PharmaciesList.tsx`, `LaboratoriesList.tsx`, `src/components/AvailabilityCalendar.tsx`, `src/components/DoctorJourneyStepper.tsx`, `src/components/OrgLiveFilters.tsx`.
- Edited: `Auth.tsx`, `PatientHome.tsx`, `DoctorsList.tsx`, `SuperAdminDashboard.tsx`, all four org owner dashboards, `DoctorDashboard.tsx`, `App.tsx` (routes).
- One migration for the signup trigger + backfill + realtime publication.

## Answer to your question

> "Is the system perfect to be used right now?"

**No — not yet, and here is the honest gap list from a real user's perspective:**
- **Patient:** browsing works, but the discovery tiles above lead to empty screens. After the fixes in items 2 and 3 this becomes usable.
- **Doctor:** dashboard works, but role assignment is fragile (item 1). After the trigger fix it's reliable.
- **Org owner:** dashboards exist but are static — no realtime, no filters. Wave C fixes this.
- **Super admin:** confusing landing page (item 4).
- **Wizy / guest:** works.
- **Payments and video/voice calls:** intentionally out of scope per your phase-one rule.

After this plan ships, the system is investor-demo ready for the flows above. It is **not** production-ready until payments, calls, and a full security audit are done.

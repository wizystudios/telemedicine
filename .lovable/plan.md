# Finish patient, profile, admin, demo, and Wizy flows

## Goal
Deliver the unfinished workflows as one complete, testable experience: friendly admin details, expanded demo facilities, cleaner public profiles, a practical patient portal, and verified Wizy booking/chart updates.

## Build
1. **Patient portal**
   - Turn the patient dashboard into a clear hub for hospitals, doctors, pharmacies, booking, payment, and the signed-in patient’s appointments.
   - Add appointment cancellation and rescheduling with clear status, date, doctor, fee, and payment information.
   - Link the portal and booking actions consistently from doctor and hospital pages.

2. **Doctor and hospital pages**
   - Replace stacked bordered boxes with open, section-based layouts matching the simplified booking page.
   - Keep real profile, organization, schedule, service, pricing, insurance, review, chat, and booking data.
   - Preserve useful actions while reducing visual clutter on mobile and desktop.

3. **Admin “Angalia” details**
   - Open details from the right on larger screens and from the bottom only on phones.
   - Replace raw database keys, IDs, JSON, internal timestamps, and technical fields with a curated friendly summary for each record type.
   - Keep important identity, status, contact, service, price, booking, and verification information.

4. **Expanded one-click demo data**
   - Extend the existing idempotent admin demo seed to create a verified pharmacy, laboratory, and polyclinic, their owner accounts, services/items with prices, and sample operational records for charts.
   - Return the new facilities and credentials in the seed result so the admin sees what was created.
   - Ensure repeated seeding updates/reuses the same demo records without duplicates.

5. **Wizy and live verification**
   - Run the full Wizy flow for JK Demo Hospital and Juma Kassim, select a real open slot, confirm the exact time, and verify the stored appointment linkage.
   - Check hospital and doctor appointment/revenue charts before and after the booking and confirm their live data changes.
   - Verify the seeded pharmacy, laboratory, and clinic appear in Wizy receptionist results and their public pages/dashboard data load.

## Validation
- Run focused database checks for all demo entities, prices, slots, and appointments.
- Check the patient, doctor, hospital, admin, and Wizy screens at mobile and desktop sizes.
- Confirm the preview build, runtime, console, and network logs are clean.
- Report any browser-only limitation honestly; do not mark a walkthrough complete unless it was exercised.

## Technical notes
- Reuse existing Supabase tables, role access rules, charts, and responsive Sheet component.
- Appointment updates remain restricted to the signed-in patient’s own records.
- Realtime chart subscriptions remain role/organization scoped and are cleaned up on unmount.

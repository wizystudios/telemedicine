# Complete creation flows and end-to-end verification

## Goal
Make account and organization creation reliable, keep phone optional unless operationally required, consolidate every admin creation path into one adaptive form, and verify dashboards plus Wizy booking with real signed-in sessions.

## 1. Diagnose and fix the creation failure
- Trace the live `admin-create` request and deploy/runtime logs to identify the exact source of the current “non-2xx” response.
- Improve the shared request helper so Edge Function error bodies are surfaced as clear Swahili/English messages instead of a generic non-2xx error.
- Harden `admin-create` input validation and return correct status codes for authentication, permission, validation, duplicate email, organization linkage, upload, and database failures.
- Keep a user/doctor/owner phone number optional. Keep the organization contact phone optional too; clearly label optional fields and omit empty values rather than sending invalid data.
- Preserve strong required fields: names, email, password, doctor license, organization name/address/BRELA/license document, and a valid existing organization when linking an owner or employed doctor.
- Ensure partial failures do not leave broken records: if organization or doctor setup fails after creating an account, remove or roll back the newly created account where safely possible.
- Deploy and directly test the corrected Edge Function as an authenticated admin.

## 2. Finish the single smart admin creation experience
- Keep one adaptive creation form for patients, admins, private doctors, organization doctors, owners of existing organizations, and a new organization with its owner.
- Load eligible organizations from live data and prevent linking to a missing or mismatched organization.
- Show only fields relevant to the selected account type, with clear inline validation and success/error states.
- Move CSV organization import into the unified wizard, including preview, row validation, per-row results, and a completion summary.
- Remove unused imports and retire the three old registration forms after confirming no remaining references.

## 3. Verify and correct every requested dashboard
- Open signed-in hospital, pharmacy, laboratory, polyclinic, doctor, and admin dashboards.
- Confirm each applicable dashboard loads its live charts with role-scoped appointments, messages, orders/bookings, and payment/revenue data.
- Confirm organization dashboards expose Kumbukumbu and diagnostics, refresh after relevant live changes, and never show another organization’s data.
- Confirm the doctor dashboard loads its guided patient journey and live charts without Not Found or blank states.
- Fix any routing, loading, empty-state, subscription, or permissions issue found during the walkthrough.

## 4. Verify Wizy booking end to end
- Run the real sequence: find a facility, choose one of its doctors, load available slots, select a slot, and confirm the appointment.
- Verify the saved appointment belongs to the signed-in patient, selected doctor, selected facility context, and exact selected date/time.
- Confirm Wizy’s success state displays the exact doctor, facility, date, and time and opens the correct appointment details.
- Fix any prompt/tool/UI mismatch discovered, then repeat the flow.

## 5. Verify the Super Admin workflow
- Confirm the unified wizard can create each supported account type and assign the intended role.
- Confirm organization owners and employed doctors can only be linked to real, compatible organizations.
- Confirm creating a new organization also creates and links its owner.
- Open and exercise organization/doctor approval, Kumbukumbu, Muda wa Kuhifadhi, and Ripoti/Uchunguzi views.
- Verify non-admin users cannot access admin-only creation, approval, retention, audit, or diagnostics data.

## 6. Validation and completion criteria
- Run the project’s normal automated checks and inspect the latest preview build/runtime/network logs.
- Add focused Edge Function tests for optional phone handling, role validation, organization linkage, and malformed requests.
- Use browser walkthroughs at desktop and mobile sizes for the creation wizard, each dashboard, and Wizy confirmation.
- Record authenticated dashboard and Wizy results separately; do not claim a role is verified unless its signed-in flow was actually exercised.
- Remove test records created during verification where safe; clearly identify any retained test account or appointment.

## Technical notes
- No new database table is expected. If a discovered schema/RLS mismatch requires a change, apply only the smallest migration needed and preserve existing role-table security.
- The Edge Function will continue deriving the acting admin from the bearer token and will never trust caller-supplied ownership or admin identity.
- Realtime subscriptions remain scoped by organization/user and are always cleaned up when the dashboard unmounts.

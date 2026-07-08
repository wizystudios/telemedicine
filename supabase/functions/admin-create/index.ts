import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UploadFile = { name?: string; type?: string; base64?: string };

const ORG_TABLE: Record<string, { table: string; role: string; logoFolder: string }> = {
  hospital: { table: "hospitals", role: "hospital_owner", logoFolder: "hospital" },
  pharmacy: { table: "pharmacies", role: "pharmacy_owner", logoFolder: "pharmacy" },
  lab: { table: "laboratories", role: "lab_owner", logoFolder: "laboratory" },
  laboratory: { table: "laboratories", role: "lab_owner", logoFolder: "laboratory" },
  polyclinic: { table: "polyclinics", role: "polyclinic_owner", logoFolder: "polyclinic" },
};

const ALLOWED_ROLES = new Set([
  "patient", "doctor", "admin", "super_admin", "hospital_owner", "pharmacy_owner", "lab_owner", "polyclinic_owner",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function extFrom(file?: UploadFile | null, fallback = "bin") {
  const name = file?.name || "";
  const ext = name.includes(".") ? name.split(".").pop() : fallback;
  return (ext || fallback).toLowerCase().replace(/[^a-z0-9]/g, "") || fallback;
}

function decodeBase64(file?: UploadFile | null) {
  if (!file?.base64) return null;
  const raw = file.base64.includes(",") ? file.base64.split(",").pop()! : file.base64;
  return Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) throw new Error("Supabase secrets are missing");

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: authUser, error: userError } = await userClient.auth.getUser();
    if (userError || !authUser.user) throw new Error("You must be signed in as admin");

    const { data: roles, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.user.id)
      .in("role", ["admin", "super_admin"]);
    if (roleError) throw roleError;
    const currentRoles = (roles || []).map((row: any) => row.role);
    if (currentRoles.length === 0) throw new Error("Only admins can create managed users");

    const { action, payload = {} } = await req.json();

    async function createAuthUser(role: string) {
      if (!ALLOWED_ROLES.has(role)) throw new Error("Role is not allowed");
      if (role === "super_admin" && !currentRoles.includes("super_admin")) throw new Error("Only super admin can create another super admin");

      const email = String(clean(payload.email || payload.ownerEmail || "") || "").toLowerCase();
      const password = String(payload.password || payload.ownerPassword || "");
      if (!email || !password) throw new Error("Email and password are required");

      const firstName = String(clean(payload.firstName || payload.ownerFirstName || "") || "");
      const lastName = String(clean(payload.lastName || payload.ownerLastName || "") || "");
      const phone = String(clean(payload.phone || payload.ownerPhone || "") || "");

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName, phone, role },
      });
      if (error) throw error;
      if (!data.user) throw new Error("User creation failed");

      await admin.from("profiles").upsert({ id: data.user.id, email, first_name: firstName, last_name: lastName, phone: phone || null, role }, { onConflict: "id" });
      await admin.from("user_roles").upsert({ user_id: data.user.id, role }, { onConflict: "user_id,role" });
      return data.user;
    }

    async function uploadPrivateLicense(ownerId: string, file?: UploadFile | null) {
      const bytes = decodeBase64(file);
      if (!bytes) return null;
      const path = `${ownerId}/license-${Date.now()}.${extFrom(file, "pdf")}`;
      const { error } = await admin.storage.from("org-documents").upload(path, bytes, { contentType: file?.type || "application/octet-stream", upsert: true });
      if (error) throw error;
      return path;
    }

    async function uploadLogoAndGetUrl(folder: string, orgId: string, file?: UploadFile | null) {
      const bytes = decodeBase64(file);
      if (!bytes) return null;
      const path = `${folder}/${orgId}-logo.${extFrom(file, "png")}`;
      const { error } = await admin.storage.from("institution-logos").upload(path, bytes, { contentType: file?.type || "image/png", upsert: true });
      if (error) throw error;
      const { data } = admin.storage.from("institution-logos").getPublicUrl(path);
      return data.publicUrl;
    }

    if (action === "create_user") {
      const role = String(payload.role || "patient");
      const user = await createAuthUser(role);
      return new Response(JSON.stringify({ ok: true, userId: user.id, role }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_doctor") {
      const approveNow = Boolean(payload.autoApprove);
      const user = await createAuthUser("doctor");
      const { error } = await admin.from("doctor_profiles").insert({
        user_id: user.id,
        license_number: clean(payload.licenseNumber),
        bio: clean(payload.bio) || null,
        experience_years: Number(payload.experienceYears || 0),
        consultation_fee: Number(payload.consultationFee || 0),
        doctor_type: clean(payload.doctorType) || "general",
        is_private: true,
        is_verified: approveNow,
        org_approval_status: approveNow ? "approved" : "pending_admin",
        admin_approved_at: approveNow ? new Date().toISOString() : null,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, userId: user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_organization") {
      const orgType = String(payload.orgType || "").toLowerCase();
      const config = ORG_TABLE[orgType];
      if (!config) throw new Error("Choose a valid organization type");

      const owner = await createAuthUser(config.role);
      const licensePath = await uploadPrivateLicense(owner.id, payload.licenseFile);
      const baseOrg: Record<string, any> = {
        owner_id: owner.id,
        name: clean(payload.name),
        description: clean(payload.description) || null,
        address: clean(payload.address),
        phone: clean(payload.orgPhone || payload.phone) || null,
        email: clean(payload.orgEmail || payload.email) || null,
        is_verified: Boolean(payload.autoApprove),
        brela_number: clean(payload.brelaNumber) || null,
        tin_number: clean(payload.tinNumber) || null,
        license_document_url: licensePath,
        org_approval_status: payload.autoApprove ? "approved" : "pending_admin",
      };
      if (!baseOrg.name || !baseOrg.address) throw new Error("Organization name and address are required");
      if (config.table === "hospitals") baseOrg.website = clean(payload.website) || null;
      if (config.table === "pharmacies") {
        baseOrg.location_lat = payload.latitude ? Number(payload.latitude) : null;
        baseOrg.location_lng = payload.longitude ? Number(payload.longitude) : null;
      }

      const { data: org, error } = await admin.from(config.table).insert(baseOrg).select("id").single();
      if (error) {
        await admin.auth.admin.deleteUser(owner.id);
        throw error;
      }

      const logoUrl = await uploadLogoAndGetUrl(config.logoFolder, org.id, payload.logoFile);
      if (logoUrl) await admin.from(config.table).update({ logo_url: logoUrl }).eq("id", org.id);
      return new Response(JSON.stringify({ ok: true, userId: owner.id, orgId: org.id, table: config.table, role: config.role }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unknown admin action");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Admin action failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
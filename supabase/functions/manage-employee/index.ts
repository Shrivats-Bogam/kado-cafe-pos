// supabase/functions/manage-employee/index.ts
// Secure server-side employee provisioning and identity management for Kado Cafe POS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = ["Owner", "Manager", "Cashier", "Staff", "Waiter", "Kitchen"];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration missing required credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate caller using client Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: callerUser }, error: callerAuthError } = await callerClient.auth.getUser(token);
    if (callerAuthError || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Initialize privileged Admin Client (Server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 3. Resolve caller's organization membership and enforce Owner role
    const { data: callerMember, error: callerMemberError } = await supabaseAdmin
      .from("organization_members")
      .select("id, organization_id, user_id, role, active")
      .eq("user_id", callerUser.id)
      .eq("active", true)
      .maybeSingle();

    if (callerMemberError || !callerMember) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: No active organization membership found for caller" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (callerMember.role !== "Owner") {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Only an Owner can manage employee provisioning" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-enforced organization_id (Never trust browser-supplied org ID)
    const organizationId = callerMember.organization_id;

    // 4. Parse request action
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ACTION: PROVISION
    if (action === "provision") {
      const { name, email, role, pin } = body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "Employee name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!role || !ALLOWED_ROLES.includes(role)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanPin = String(pin || "").trim();
      if (!cleanPin || cleanPin.length < 4) {
        return new Response(
          JSON.stringify({ success: false, error: "PIN must be at least 4 digits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check PIN uniqueness within the organization for active employees
      const { data: existingPin, error: pinCheckError } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("pin_code", cleanPin)
        .eq("active", true)
        .maybeSingle();

      if (pinCheckError) {
        return new Response(
          JSON.stringify({ success: false, error: "Database error verifying PIN uniqueness" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingPin) {
        return new Response(
          JSON.stringify({ success: false, error: "PIN is already assigned to an active employee in your organization" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let createdAuthUserId = null;
      const cleanEmail = email && typeof email === "string" ? email.trim().toLowerCase() : null;

      // If email provided, create Auth identity via Supabase Auth Invitation
      if (cleanEmail) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid email format" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send email invitation so employee sets their own password
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          data: {
            name: name.trim(),
            role,
            organization_id: organizationId
          }
        });

        if (inviteError || !inviteData?.user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: inviteError?.message || "Failed to create Supabase Auth invitation for employee"
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        createdAuthUserId = inviteData.user.id;
      }

      // Insert organization_members record
      const { data: newMember, error: insertError } = await supabaseAdmin
        .from("organization_members")
        .insert({
          organization_id: organizationId,
          user_id: createdAuthUserId,
          name: name.trim(),
          role,
          pin_code: cleanPin,
          active: true
        })
        .select("id, organization_id, user_id, name, role, active, created_at")
        .single();

      // Rollback safety: If membership insert fails after Auth user creation, delete orphaned Auth user
      if (insertError || !newMember) {
        if (createdAuthUserId) {
          try { await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId); } catch { /* rollback error */ }
        }
        return new Response(
          JSON.stringify({ success: false, error: insertError?.message || "Failed to save organization membership" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            member_id: newMember.id,
            user_id: newMember.user_id,
            name: newMember.name,
            role: newMember.role,
            organization_id: newMember.organization_id,
            active: newMember.active,
            invite_sent: Boolean(cleanEmail)
          }
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: UPDATE
    if (action === "update") {
      const { member_id, name, role, pin } = body;

      if (!member_id) {
        return new Response(
          JSON.stringify({ success: false, error: "member_id is required for update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify member exists in this organization
      const { data: targetMember, error: fetchError } = await supabaseAdmin
        .from("organization_members")
        .select("id, organization_id, user_id, pin_code")
        .eq("id", member_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (fetchError || !targetMember) {
        return new Response(
          JSON.stringify({ success: false, error: "Employee record not found in organization" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name && typeof name === "string") updates.name = name.trim();
      if (role && ALLOWED_ROLES.includes(role)) updates.role = role;

      if (pin) {
        const cleanPin = String(pin).trim();
        if (cleanPin.length < 4) {
          return new Response(
            JSON.stringify({ success: false, error: "PIN must be at least 4 digits" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (cleanPin !== targetMember.pin_code) {
          // Check PIN uniqueness
          const { data: pinConflict } = await supabaseAdmin
            .from("organization_members")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("pin_code", cleanPin)
            .eq("active", true)
            .neq("id", member_id)
            .maybeSingle();

          if (pinConflict) {
            return new Response(
              JSON.stringify({ success: false, error: "PIN is already assigned to another active employee" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updates.pin_code = cleanPin;
        }
      }

      const { data: updatedMember, error: updateError } = await supabaseAdmin
        .from("organization_members")
        .update(updates)
        .eq("id", member_id)
        .select("id, organization_id, user_id, name, role, active, updated_at")
        .single();

      if (updateError || !updatedMember) {
        return new Response(
          JSON.stringify({ success: false, error: updateError?.message || "Failed to update employee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sync user metadata in Supabase Auth if linked
      if (targetMember.user_id && (updates.name || updates.role)) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetMember.user_id, {
            user_metadata: {
              ...(updates.name ? { name: updates.name } : {}),
              ...(updates.role ? { role: updates.role } : {})
            }
          });
        } catch { /* non-fatal metadata sync */ }
      }

      return new Response(
        JSON.stringify({ success: true, data: updatedMember }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: TOGGLE-STATUS (Disable / Enable)
    if (action === "toggle-status") {
      const { member_id } = body;

      if (!member_id) {
        return new Response(
          JSON.stringify({ success: false, error: "member_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetMember, error: fetchError } = await supabaseAdmin
        .from("organization_members")
        .select("id, organization_id, user_id, active")
        .eq("id", member_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (fetchError || !targetMember) {
        return new Response(
          JSON.stringify({ success: false, error: "Employee record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent Owner from disabling themselves
      if (targetMember.user_id === callerUser.id) {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden: You cannot disable your own Owner account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nextActive = !targetMember.active;
      const { data: updatedMember, error: updateError } = await supabaseAdmin
        .from("organization_members")
        .update({ active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", member_id)
        .select("id, organization_id, user_id, name, role, active, updated_at")
        .single();

      if (updateError || !updatedMember) {
        return new Response(
          JSON.stringify({ success: false, error: updateError?.message || "Failed to update employee status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: updatedMember }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unsupported action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  userData: {
    name: string;
    role: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, password, userData }: CreateUserRequest = await req.json();
    
    console.log('Creating user with admin privileges:', email);
    console.log('Password being set:', password);
    console.log('User data:', userData);

    // First, check if user already exists
    const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching existing users:', fetchError);
    } else {
      const existingUser = existingUsers.users.find(u => u.email === email);
      if (existingUser) {
        console.log('User already exists with ID:', existingUser.id);
        console.log('User confirmed status:', existingUser.email_confirmed_at ? 'confirmed' : 'not confirmed');
        
        // Update the existing user's password and confirm them
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password: password,
            email_confirm: true,
            user_metadata: {
              full_name: userData.name,
              role: userData.role,
              needs_password_reset: true
            }
          }
        );
        
        if (updateError) {
          console.error('Error updating existing user:', updateError);
          throw updateError;
        }
        
        console.log('Successfully updated existing user');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User updated and confirmed',
          user: updateData.user 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Create user with admin API - this auto-confirms the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: userData.name,
        role: userData.role,
        needs_password_reset: true
      }
    });

    if (authError) {
      console.error('Failed to create user:', authError);
      throw authError;
    }

    console.log('User created and confirmed successfully:', authData.user?.email);
    console.log('User ID:', authData.user?.id);
    console.log('Email confirmed at:', authData.user?.email_confirmed_at);

    return new Response(JSON.stringify({ 
      success: true, 
      user: authData.user,
      message: 'User created successfully' 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Error in create-invited-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);

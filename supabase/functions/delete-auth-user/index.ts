
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  email: string;
  cleanup_only?: boolean;
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

    const { email, cleanup_only }: DeleteUserRequest = await req.json();
    
    console.log('Processing request for user:', email, cleanup_only ? '(cleanup only)' : '(full deletion)');

    // First, find the user by email
    const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      throw fetchError;
    }

    const userToDelete = existingUsers.users.find(u => u.email === email);
    
    if (!userToDelete) {
      console.log('User not found with email:', email);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User not found or already deleted',
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('Found user:', userToDelete.id);

    // Clean up activity feed records that reference this user
    try {
      console.log('Deleting activity feed records for user:', userToDelete.id);
      
      const { error: activityError } = await supabaseAdmin
        .from('activity_feed')
        .delete()
        .eq('user_id', userToDelete.id);

      if (activityError) {
        console.error('Error deleting activity feed records:', activityError);
        // Continue anyway - this shouldn't block the user deletion
      } else {
        console.log('Successfully deleted activity feed records');
      }
    } catch (activityError) {
      console.error('Failed to delete activity feed records:', activityError);
      // Continue anyway
    }

    // If this is just a cleanup request, return here
    if (cleanup_only) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Activity feed cleanup completed' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Delete the user using admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userToDelete.id
    );

    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      throw deleteError;
    }

    console.log('User deleted successfully:', email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User deleted successfully' 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Error in delete-auth-user function:', error);
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

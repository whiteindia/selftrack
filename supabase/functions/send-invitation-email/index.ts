
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  role: string;
  invitedBy: string;
  employeeData?: {
    name: string;
    contact_number?: string;
  };
  clientData?: {
    name: string;
    company?: string;
    phone?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge function called - checking environment variables');
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set');
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }
    console.log('RESEND_API_KEY is configured');

    const { email, role, invitedBy, employeeData, clientData }: InvitationEmailRequest = await req.json();

    console.log('Sending invitation email to:', email, 'with role:', role);

    const isClient = role === 'client';
    const userData = isClient ? clientData : employeeData;
    const userName = userData?.name || email;

    // Create the invitation email HTML with login credentials
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>You're Invited!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .credentials-box { background: #e8f4fd; border: 1px solid #bee5eb; border-radius: 5px; padding: 20px; margin: 20px 0; }
            .credentials-title { font-weight: bold; color: #0c5460; margin-bottom: 10px; }
            .credential-item { margin: 8px 0; font-family: monospace; background: #ffffff; padding: 8px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>You have been invited to join our platform as a <strong>${role}</strong>.</p>
              
              <div class="credentials-box">
                <div class="credentials-title">🔑 Your Login Credentials</div>
                <p>You can log in immediately using these credentials:</p>
                <div class="credential-item"><strong>Email:</strong> ${email}</div>
                <div class="credential-item"><strong>Password:</strong> ${email}</div>
                <p><small><em>For security, please change your password after your first login.</em></small></p>
              </div>
              
              ${isClient ? `
                <p>As a client, you'll be able to:</p>
                <ul>
                  <li>View your projects and their progress</li>
                  <li>Track tasks assigned to your projects</li>
                  <li>Access your invoices and payment history</li>
                  <li>Communicate with your project team</li>
                </ul>
              ` : `
                <p>As an employee, you'll be able to:</p>
                <ul>
                  <li>Manage projects and tasks</li>
                  <li>Track your time and activities</li>
                  <li>Collaborate with team members</li>
                  <li>Access company resources</li>
                </ul>
              `}
              
              <p><strong>Important Security Note:</strong> Your temporary password is the same as your email address. Please log in and change your password as soon as possible for security.</p>
              
              <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
              
              <p>Welcome aboard!</p>
            </div>
            <div class="footer">
              <p>This invitation was sent by your organization administrator.</p>
              <p>If you believe you received this email in error, please ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('Attempting to send email via Resend...');
    
    const emailResponse = await resend.emails.send({
      from: "Your Platform <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to join as ${role} - Login Credentials Included`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      message: "Email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Check the edge function logs for more information"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

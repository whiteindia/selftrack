
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  client_id: string | null;
  employee_data: any;
  status: string;
  created_at: string;
  expires_at: string;
}

interface EmailPayload {
  email: string;
  role: string;
  invitedBy: string;
  clientData?: {
    name: string;
    company: string;
    phone: string;
  };
  employeeData?: {
    name: string;
    contact_number: string;
  };
}

export const useInvitations = () => {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invitation[];
    }
  });

  const createUserWithAdminPrivileges = async (email: string, userData: any) => {
    console.log('Creating auth user via edge function for:', email, 'with role:', userData.role);
    
    try {
      const { data: response, error } = await supabase.functions.invoke(
        'create-invited-user',
        {
          body: {
            email: email,
            password: email, // Use email as default password
            userData: {
              name: userData.name,
              role: userData.role // Ensure the role is passed correctly
            }
          }
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!response?.success) {
        console.error('Edge function returned unsuccessful response:', response);
        throw new Error(response?.error || 'Failed to create user');
      }

      console.log('User created successfully via edge function with role:', userData.role, response);

      // After creating the auth user, assign the correct role in user_roles table
      if (response.user) {
        console.log('Assigning role to user in user_roles table:', userData.role);
        
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: response.user.id,
            role: userData.role
          }]);

        if (roleError) {
          console.error('Failed to assign role in user_roles table:', roleError);
          // Don't throw here as the user was created successfully
        } else {
          console.log('Role assigned successfully in user_roles table:', userData.role);
        }
      }

      return { user: response.user, error: null };
      
    } catch (error) {
      console.error('Error in createUserWithAdminPrivileges:', error);
      throw error;
    }
  };

  const sendInvitation = useMutation({
    mutationFn: async (invitationData: {
      email: string;
      role: string;
      client_id?: string;
      employee_data?: any;
    }) => {
      console.log('Starting invitation process for:', invitationData.email, 'with role:', invitationData.role);
      
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create user in Supabase Auth with admin privileges via edge function
      try {
        await createUserWithAdminPrivileges(invitationData.email, {
          name: invitationData.employee_data?.name || invitationData.email.split('@')[0],
          role: invitationData.role // Pass the correct role
        });
        console.log('User created with admin privileges and auto-confirmed with role:', invitationData.role);
      } catch (authError) {
        console.error('Failed to create user with admin privileges:', authError);
        // Continue with invitation creation even if user creation fails
      }

      console.log('Creating invitation record with role:', invitationData.role);
      const { data, error } = await supabase
        .from('invitations')
        .insert([{
          email: invitationData.email,
          role: invitationData.role, // Store the correct role
          invited_by: user.id,
          client_id: invitationData.client_id || null,
          employee_data: invitationData.employee_data || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Failed to create invitation record:', error);
        throw error;
      }
      
      console.log('Invitation record created successfully with role:', invitationData.role, data);
      
      // Prepare email payload
      const emailPayload: EmailPayload = {
        email: invitationData.email,
        role: invitationData.role, // Use the correct role
        invitedBy: user.id
      };

      // Add role-specific data
      if (invitationData.role === 'client') {
        emailPayload.clientData = {
          name: invitationData.employee_data?.name || invitationData.email.split('@')[0],
          company: invitationData.employee_data?.company || '',
          phone: invitationData.employee_data?.phone || ''
        };
      } else {
        emailPayload.employeeData = {
          name: invitationData.employee_data?.name || invitationData.email.split('@')[0],
          contact_number: invitationData.employee_data?.contact_number || ''
        };
      }

      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
          'send-invitation-email',
          {
            body: emailPayload
          }
        );

        if (emailError) {
          console.error('Email function error:', emailError);
          toast.error(`User created but email failed to send: ${emailError.message}`);
          return data;
        }

        if (!emailResponse?.success) {
          console.error('Email function returned unsuccessful response:', emailResponse);
          toast.error(`User created but email failed to send: ${emailResponse?.error || 'Unknown error'}`);
          return data;
        }

        console.log('Invitation email sent successfully for role:', invitationData.role);
        toast.success(`User created and confirmed with role ${invitationData.role}! They can now login immediately with their email as password.`);
        return data;

      } catch (emailError) {
        console.error('Email sending error:', emailError);
        toast.error(`User created but email failed to send: ${(emailError as Error).message}`);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error) => {
      console.error('Failed to create user/invitation:', error);
      toast.error(`Failed to create user/invitation: ${error.message}`);
    }
  });

  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    }
  });

  return {
    invitations,
    isLoading,
    sendInvitation,
    deleteInvitation
  };
};

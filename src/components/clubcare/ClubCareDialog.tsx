import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClubCareConnection {
  id: string;
  relation_type: string;
  person_contact: string;
  description: string;
  frequency: string;
  start_date: string;
}

interface ClubCareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ClubCareConnection | null;
}

const ClubCareDialog = ({ open, onOpenChange, connection }: ClubCareDialogProps) => {
  const form = useForm({
    defaultValues: {
      relation_type: '',
      person_contact: '',
      description: '',
      frequency: '',
      start_date: '',
    },
  });

  useEffect(() => {
    if (connection) {
      form.reset({
        relation_type: connection.relation_type,
        person_contact: connection.person_contact,
        description: connection.description,
        frequency: connection.frequency,
        start_date: connection.start_date,
      });
    } else {
      form.reset({
        relation_type: '',
        person_contact: '',
        description: '',
        frequency: '',
        start_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [connection, form]);

  const onSubmit = async (data: any) => {
    try {
      if (connection) {
        const { error } = await supabase
          .from('club_care')
          .update(data)
          .eq('id', connection.id);

        if (error) throw error;
        toast.success('Connection updated successfully');
      } else {
        const { error } = await supabase
          .from('club_care')
          .insert([data]);

        if (error) throw error;
        toast.success('Connection added successfully');
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Failed to save connection');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {connection ? 'Edit Connection' : 'Add New Connection'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="relation_type"
              rules={{ required: 'Relation type is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relation Type</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Help, Support, Family" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="person_contact"
              rules={{ required: 'Person/Contact is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person / Contact</FormLabel>
                  <FormControl>
                    <Input placeholder="Name or organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              rules={{ required: 'Description is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the connection and its purpose"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              rules={{ required: 'Frequency is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency of Interaction</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Daily, Weekly, Monthly" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              rules={{ required: 'Start date is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {connection ? 'Update' : 'Add'} Connection
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClubCareDialog;

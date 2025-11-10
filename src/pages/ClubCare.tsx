import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClubCareDialog from '@/components/clubcare/ClubCareDialog';

interface ClubCareConnection {
  id: string;
  relation_type: string;
  person_contact: string;
  description: string;
  frequency: string;
  start_date: string;
}

const ClubCare = () => {
  const [connections, setConnections] = useState<ClubCareConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConnection, setEditingConnection] = useState<ClubCareConnection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('club_care')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleEdit = (connection: ClubCareConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const { error } = await supabase
        .from('club_care')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Connection deleted successfully');
      fetchConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Failed to delete connection');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingConnection(null);
    fetchConnections();
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ClubCare</h1>
            <p className="text-muted-foreground mt-1">
              Manage your relationships and professional connections
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingConnection(null);
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        </div>

        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No connections found. Add your first connection to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relation Type</TableHead>
                  <TableHead>Person / Contact</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      {connection.relation_type}
                    </TableCell>
                    <TableCell>{connection.person_contact}</TableCell>
                    <TableCell className="max-w-md">
                      {connection.description}
                    </TableCell>
                    <TableCell>{connection.frequency}</TableCell>
                    <TableCell>
                      {new Date(connection.start_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(connection)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(connection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <ClubCareDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          connection={editingConnection}
        />
      </div>
    </Navigation>
  );
};

export default ClubCare;

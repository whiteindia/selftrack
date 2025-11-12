import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NetworkPersonDialog } from "@/components/network/NetworkPersonDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NetworkPerson {
  id: string;
  name: string;
  relationship_type: string;
  role_position: string;
  industry_domain: string;
  work_type: string;
  influence_level: string;
  last_conversation_summary?: string;
  last_conversation_date?: string;
  follow_up_plan?: string;
}

export default function NetworkPeople() {
  const [people, setPeople] = useState<NetworkPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  const fetchPeople = async () => {
    try {
      const { data, error } = await supabase
        .from("network_people")
        .select("*")
        .order("name");

      if (error) throw error;
      setPeople(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleEdit = (person: NetworkPerson) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!personToDelete) return;

    try {
      const { error } = await supabase
        .from("network_people")
        .delete()
        .eq("id", personToDelete);

      if (error) throw error;
      toast.success("Contact deleted successfully");
      fetchPeople();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
    } finally {
      setDeleteDialogOpen(false);
      setPersonToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPerson(null);
    fetchPeople();
  };

  const confirmDelete = (id: string) => {
    setPersonToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Network People Profiles Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage your professional network and relationships
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">S.No</TableHead>
              <TableHead>Name / Profile</TableHead>
              <TableHead>Relationship Type</TableHead>
              <TableHead>Role / Position</TableHead>
              <TableHead>Industry / Domain</TableHead>
              <TableHead>Work Type</TableHead>
              <TableHead>Influence Level</TableHead>
              <TableHead>Last Conversation Summary</TableHead>
              <TableHead>Last Conversation Date</TableHead>
              <TableHead>Follow-up Plan</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No contacts found. Add your first contact to get started.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person, index) => (
                <TableRow key={person.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.relationship_type}</TableCell>
                  <TableCell>{person.role_position}</TableCell>
                  <TableCell>{person.industry_domain}</TableCell>
                  <TableCell>{person.work_type}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        person.influence_level === "High"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : person.influence_level === "Medium"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {person.influence_level}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {person.last_conversation_summary || "-"}
                  </TableCell>
                  <TableCell>
                    {person.last_conversation_date
                      ? new Date(person.last_conversation_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {person.follow_up_plan || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(person)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(person.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NetworkPersonDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        person={selectedPerson}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact
              from your network.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

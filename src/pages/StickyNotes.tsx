import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Filter, X, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface StickyNote {
  id: string;
  title: string;
  content: string;
  service_id: string | null;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  service_name?: string;
  client_name?: string;
  project_name?: string;
  tags?: Tag[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Service {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  service: string;
  client_name: string;
}

const StickyNotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('recent'); // 'recent' or 'all'
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const [tagFilter, setTagFilter] = useState('all');
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    service_id: '',
    client_id: '',
    project_id: '',
    selectedTags: [] as string[]
  });

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Tag[];
    }
  });

  // Fetch sticky notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['sticky-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sticky_notes')
        .select(`
          *,
          sticky_note_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich notes with service, client, project names and tags
      const enrichedNotes = await Promise.all(
        (data || []).map(async (note) => {
          let serviceName = null;
          let clientName = null;
          let projectName = null;

          if (note.service_id) {
            const { data: service } = await supabase
              .from('services')
              .select('name')
              .eq('id', note.service_id)
              .single();
            serviceName = service?.name;
          }

          if (note.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', note.client_id)
              .single();
            clientName = client?.name;
          }

          if (note.project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', note.project_id)
              .single();
            projectName = project?.name;
          }

          // Extract tags from the joined data
          const noteTags = note.sticky_note_tags?.map((snt: any) => snt.tags).filter(Boolean) || [];

          return {
            ...note,
            service_name: serviceName,
            client_name: clientName,
            project_name: projectName,
            tags: noteTags
          };
        })
      );

      return enrichedNotes as StickyNote[];
    },
    enabled: !!user
  });

  // Fetch services for filter
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Service[];
    }
  });

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Client[];
    }
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_project_info')
        .select('*')
        .order('name');
      if (error) throw error;
      
      return data.map(p => ({
        id: p.id,
        name: p.name,
        service: p.service,
        client_name: p.client_name
      })) as Project[];
    }
  });

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === 'all' || note.service_id === serviceFilter;
      const matchesClient = clientFilter === 'all' || note.client_id === clientFilter;
      const matchesProject = projectFilter === 'all' || note.project_id === projectFilter;
      const matchesTag = tagFilter === 'all' || note.tags?.some(tag => tag.id === tagFilter);
      
      // Date filtering - show recent 2 months by default
      let matchesDate = true;
      if (dateFilter === 'recent') {
        const noteDate = new Date(note.created_at);
        const now = new Date();
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(now.getMonth() - 1);
        twoMonthsAgo.setDate(1); // Start of previous month
        matchesDate = noteDate >= twoMonthsAgo;
      }
      
      return matchesSearch && matchesService && matchesClient && matchesProject && matchesTag && matchesDate;
    });
  }, [notes, searchTerm, serviceFilter, clientFilter, projectFilter, tagFilter, dateFilter]);

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ name, color }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTagName('');
      setNewTagColor('#6366f1');
      setIsCreateTagDialogOpen(false);
      toast.success('Tag created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create tag: ' + error.message);
    }
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const { data, error } = await supabase
        .from('sticky_notes')
        .insert([{
          title: noteData.title,
          content: noteData.content,
          user_id: user?.id,
          service_id: noteData.service_id === 'none' ? null : noteData.service_id || null,
          client_id: noteData.client_id === 'none' ? null : noteData.client_id || null,
          project_id: noteData.project_id === 'none' ? null : noteData.project_id || null
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Add tag relationships
      if (noteData.selectedTags && noteData.selectedTags.length > 0) {
        const tagRelations = noteData.selectedTags.map((tagId: string) => ({
          sticky_note_id: data.id,
          tag_id: tagId
        }));
        
        const { error: tagError } = await supabase
          .from('sticky_note_tags')
          .insert(tagRelations);
        
        if (tagError) throw tagError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sticky-notes'] });
      setNewNote({
        title: '',
        content: '',
        service_id: '',
        client_id: '',
        project_id: '',
        selectedTags: []
      });
      setIsCreateDialogOpen(false);
      toast.success('Note created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create note: ' + error.message);
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Update note
      const { data, error } = await supabase
        .from('sticky_notes')
        .update({
          title: updates.title,
          content: updates.content,
          service_id: updates.service_id === 'none' ? null : updates.service_id || null,
          client_id: updates.client_id === 'none' ? null : updates.client_id || null,
          project_id: updates.project_id === 'none' ? null : updates.project_id || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Update tag relationships
      if (updates.selectedTags !== undefined) {
        // Delete existing tag relationships
        await supabase
          .from('sticky_note_tags')
          .delete()
          .eq('sticky_note_id', id);

        // Add new tag relationships
        if (updates.selectedTags.length > 0) {
          const tagRelations = updates.selectedTags.map((tagId: string) => ({
            sticky_note_id: id,
            tag_id: tagId
          }));
          
          const { error: tagError } = await supabase
            .from('sticky_note_tags')
            .insert(tagRelations);
          
          if (tagError) throw tagError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sticky-notes'] });
      setEditingNote(null);
      toast.success('Note updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update note: ' + error.message);
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('sticky_notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sticky-notes'] });
      toast.success('Note deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete note: ' + error.message);
    }
  });

  const handleCreateNote = () => {
    if (!newNote.title || !newNote.content) {
      toast.error('Please fill in title and content');
      return;
    }
    createNoteMutation.mutate(newNote);
  };

  const handleUpdateNote = (updates: any) => {
    if (!editingNote) return;
    updateNoteMutation.mutate({ id: editingNote.id, updates });
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }
    createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setServiceFilter('all');
    setClientFilter('all');
    setProjectFilter('all');
    setTagFilter('all');
    setDateFilter('recent');
  };

  // Helper function to check if content needs "View More"
  const needsViewMore = (content: string) => {
    // Rough estimation: if content has more than 150 characters or more than 3 lines
    return content.length > 150 || content.split('\n').length > 3;
  };

  // Helper function to toggle note expansion
  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Helper function to get truncated content
  const getTruncatedContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    
    // Find the last space before maxLength to avoid cutting words
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) { // If we can find a space in the last 20%
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  if (notesLoading) {
    return (
      <Navigation>
        <div className="container mx-auto p-6">
          <div className="text-center">Loading sticky notes...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <StickyNote className="h-8 w-8" />
              Sticky Notes
            </h1>
            <p className="text-gray-600 mt-1">Organize your thoughts and ideas</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Add a new sticky note with optional categorization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    placeholder="Enter note title"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    placeholder="Enter note content"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="service">Service (Optional)</Label>
                  <Select value={newNote.service_id} onValueChange={(value) => setNewNote({ ...newNote, service_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No service</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select value={newNote.client_id} onValueChange={(value) => setNewNote({ ...newNote, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select value={newNote.project_id} onValueChange={(value) => setNewNote({ ...newNote, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tags">Tags (Optional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreateTagDialogOpen(true)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Tag
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white cursor-pointer transition-opacity ${
                          newNote.selectedTags.includes(tag.id) ? 'opacity-100' : 'opacity-60'
                        }`}
                        style={{ backgroundColor: tag.color }}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={newNote.selectedTags.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewNote({ ...newNote, selectedTags: [...newNote.selectedTags, tag.id] });
                            } else {
                              setNewNote({ ...newNote, selectedTags: newNote.selectedTags.filter(id => id !== tag.id) });
                            }
                          }}
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
          <div>
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent (2 Months)</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNote(note)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-gray-600">
                    {expandedNotes.has(note.id) 
                      ? note.content 
                      : needsViewMore(note.content) 
                        ? getTruncatedContent(note.content)
                        : note.content
                    }
                  </p>
                  {needsViewMore(note.content) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-800 hover:bg-transparent"
                      onClick={() => toggleNoteExpansion(note.id)}
                    >
                      {expandedNotes.has(note.id) ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          View Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          View More
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {note.service_name && (
                    <Badge variant="secondary" className="text-xs">
                      Service: {note.service_name}
                    </Badge>
                  )}
                  {note.client_name && (
                    <Badge variant="outline" className="text-xs">
                      Client: {note.client_name}
                    </Badge>
                  )}
                  {note.project_name && (
                    <Badge variant="default" className="text-xs">
                      Project: {note.project_name}
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-4">
                  Updated: {format(new Date(note.updated_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <StickyNote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
            <p className="text-gray-600">
              {notes.length === 0 
                ? "Create your first sticky note to get started" 
                : "Try adjusting your filters or search term"}
            </p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update your sticky note
              </DialogDescription>
            </DialogHeader>
            {editingNote && (
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
                <div>
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    placeholder="Enter note title"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-content">Content *</Label>
                  <Textarea
                    id="edit-content"
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    placeholder="Enter note content"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-service">Service (Optional)</Label>
                  <Select 
                    value={editingNote.service_id || 'none'} 
                    onValueChange={(value) => setEditingNote({ ...editingNote, service_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No service</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-client">Client (Optional)</Label>
                  <Select 
                    value={editingNote.client_id || 'none'} 
                    onValueChange={(value) => setEditingNote({ ...editingNote, client_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-project">Project (Optional)</Label>
                  <Select 
                    value={editingNote.project_id || 'none'} 
                    onValueChange={(value) => setEditingNote({ ...editingNote, project_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-tags">Tags (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white cursor-pointer transition-opacity ${
                          editingNote.tags?.some(t => t.id === tag.id) ? 'opacity-100' : 'opacity-60'
                        }`}
                        style={{ backgroundColor: tag.color }}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={editingNote.tags?.some(t => t.id === tag.id) || false}
                          onChange={(e) => {
                            const currentTags = editingNote.tags || [];
                            if (e.target.checked) {
                              setEditingNote({ 
                                ...editingNote, 
                                tags: [...currentTags, tag]
                              });
                            } else {
                              setEditingNote({ 
                                ...editingNote, 
                                tags: currentTags.filter(t => t.id !== tag.id)
                              });
                            }
                          }}
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={() => handleUpdateNote({
                  title: editingNote.title,
                  content: editingNote.content,
                  service_id: editingNote.service_id,
                  client_id: editingNote.client_id,
                  project_id: editingNote.project_id,
                  selectedTags: editingNote.tags?.map(t => t.id) || []
                })} 
                disabled={updateNoteMutation.isPending}
              >
                {updateNoteMutation.isPending ? 'Updating...' : 'Update Note'}
              </Button>
              <Button variant="outline" onClick={() => setEditingNote(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Tag Dialog */}
        <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag for organizing your notes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Tag Name *</Label>
                <Input
                  id="tag-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <Label htmlFor="tag-color">Tag Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="tag-color"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-12 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{newTagColor}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateTag} disabled={createTagMutation.isPending}>
                  {createTagMutation.isPending ? 'Creating...' : 'Create Tag'}
                </Button>
                <Button variant="outline" onClick={() => setIsCreateTagDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default StickyNotes;
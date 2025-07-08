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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Filter, X, StickyNote, ChevronDown, ChevronUp, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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

  // Enhanced tag filtering
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);

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

  // Fetch tags (temporarily using original tags table until migration is complete)
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
      console.log('🔍 StickyNotes: Fetching notes, user:', user?.id);
      
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

      console.log('📝 StickyNotes: Query result:', { data: data?.length, error });
      if (error) {
        console.error('❌ StickyNotes: Query error:', error);
        throw error;
      }

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
          
          // Debug: Log tag data
          console.log('StickyNote:', note.id, 'Raw sticky_note_tags:', note.sticky_note_tags);
          console.log('StickyNote:', note.id, 'Extracted tags:', noteTags);

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
      
      // Enhanced tag filtering - support multiple tag filters
      let matchesTag = true;
      if (selectedTagFilters.length > 0) {
        const noteTagIds = note.tags?.map(tag => tag.id) || [];
        matchesTag = selectedTagFilters.every(tagId => noteTagIds.includes(tagId));
      }
      
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
  }, [notes, searchTerm, serviceFilter, clientFilter, projectFilter, selectedTagFilters, dateFilter]);

  // Filtered tags for search
  const filteredTags = useMemo(() => {
    if (!tagSearchTerm) return tags;
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
    );
  }, [tags, tagSearchTerm]);

  // Create tag mutation (temporarily using original tags table)
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
      toast.error('Tag name is required');
      return;
    }
    createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setServiceFilter('all');
    setClientFilter('all');
    setProjectFilter('all');
    setSelectedTagFilters([]);
    setDateFilter('recent');
  };

  const needsViewMore = (content: string) => {
    return content.length > 150;
  };

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

  const getTruncatedContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Tag selection component
  const TagSelector = ({ 
    selectedTags, 
    onTagsChange, 
    placeholder = "Select tags..." 
  }: { 
    selectedTags: string[]; 
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTagsForSelection = useMemo(() => {
      if (!searchTerm) return tags;
      return tags.filter(tag => 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [tags, searchTerm]);

    const handleTagToggle = (tagId: string) => {
      const newSelectedTags = selectedTags.includes(tagId)
        ? selectedTags.filter(id => id !== tagId)
        : [...selectedTags, tagId];
      onTagsChange(newSelectedTags);
    };

    const selectedTagObjects = tags.filter(tag => selectedTags.includes(tag.id));

    return (
      <div className="space-y-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-between"
            >
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedTagObjects.length > 0 ? (
                  selectedTagObjects.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: tag.color, color: 'white' }}
                    >
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search tags..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {filteredTagsForSelection.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleTagToggle(tag.id)}
                    >
                      <Checkbox
                        checked={selectedTags.includes(tag.id)}
                        className="mr-2"
                      />
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateTagDialogOpen(true);
                    }}
                    className="w-full justify-start text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create new tag
                  </Button>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  if (notesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading notes...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-4 p-2 sm:space-y-6 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sticky Notes</h1>
            <p className="text-gray-600 mt-1">Organize your thoughts and ideas</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Add a new sticky note with optional categorization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
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
                  <TagSelector
                    selectedTags={newNote.selectedTags}
                    onTagsChange={(tags) => setNewNote({ ...newNote, selectedTags: tags })}
                    placeholder="Select tags..."
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
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

        {/* Enhanced Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
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
          
          {/* Enhanced Tag Filter */}
          <Popover open={isTagFilterOpen} onOpenChange={setIsTagFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isTagFilterOpen}
                className="w-full justify-between"
              >
                <Tag className="mr-2 h-4 w-4" />
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedTagFilters.length > 0 ? (
                    selectedTagFilters.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: tag.color, color: 'white' }}
                        >
                          {tag.name}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <span className="text-muted-foreground">Filter by tags</span>
                  )}
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search tags..." 
                  value={tagSearchTerm}
                  onValueChange={setTagSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          const newSelectedTags = selectedTagFilters.includes(tag.id)
                            ? selectedTagFilters.filter(id => id !== tag.id)
                            : [...selectedTagFilters, tag.id];
                          setSelectedTagFilters(newSelectedTags);
                        }}
                      >
                        <Checkbox
                          checked={selectedTagFilters.includes(tag.id)}
                          className="mr-2"
                        />
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
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
                  <CardTitle className="text-lg break-words pr-2">{note.title}</CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
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
                  <p className="text-gray-600 break-words whitespace-pre-wrap">
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
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update your sticky note
              </DialogDescription>
            </DialogHeader>
            {editingNote && (
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-tags">Tags (Optional)</Label>
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
                  <TagSelector
                    selectedTags={editingNote.tags?.map(t => t.id) || []}
                    onTagsChange={(tagIds) => {
                      const selectedTagObjects = tagIds.map(tagId => 
                        tags.find(t => t.id === tagId)
                      ).filter(Boolean);
                      setEditingNote({ 
                        ...editingNote, 
                        tags: selectedTagObjects
                      });
                    }}
                    placeholder="Select tags..."
                  />
                </div>
              </div>
            )}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
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
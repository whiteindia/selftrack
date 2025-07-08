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
import { Plus, Edit, Trash2, Filter, X, StickyNote, ChevronDown, ChevronUp, Search, Tag, TrendingUp } from 'lucide-react';
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
  selectedTags?: string[];
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

const TradaNotes = () => {
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

  // Fetch trada tags
  const { data: tags = [] } = useQuery({
    queryKey: ['trada-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trada_tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Tag[];
    }
  });

  // Fetch trading notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['trada-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trada_notes')
        .select(`
          *,
          trada_note_tags (
            tag_id,
            trada_tags (
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
          const noteTags = note.trada_note_tags?.map((snt: any) => snt.trada_tags).filter(Boolean) || [];

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
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          services!inner(name),
          clients!inner(name)
        `)
        .order('name');
      if (error) throw error;
      return data.map((project: any) => ({
        id: project.id,
        name: project.name,
        service: project.services.name,
        client_name: project.clients.name
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

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('trada_tags')
        .insert([{ name, color }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trada-tags'] });
      setNewTagName('');
      setNewTagColor('#6366f1');
      setIsCreateTagDialogOpen(false);
      toast.success('Trada tag created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create trada tag: ' + error.message);
    }
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const { data, error } = await supabase
        .from('trada_notes')
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
          trada_note_id: data.id,
          tag_id: tagId
        }));
        
        const { error: tagError } = await supabase
          .from('trada_note_tags')
          .insert(tagRelations);
        
        if (tagError) throw tagError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trada-notes'] });
      setNewNote({
        title: '',
        content: '',
        service_id: '',
        client_id: '',
        project_id: '',
        selectedTags: []
      });
      setIsCreateDialogOpen(false);
      toast.success('Trading note created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create trading note: ' + error.message);
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Update note
      const { data, error } = await supabase
        .from('trada_notes')
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
          .from('trada_note_tags')
          .delete()
          .eq('trada_note_id', id);

        // Add new tag relationships
        if (updates.selectedTags.length > 0) {
          const tagRelations = updates.selectedTags.map((tagId: string) => ({
            trada_note_id: id,
            tag_id: tagId
          }));
          
          const { error: tagError } = await supabase
            .from('trada_note_tags')
            .insert(tagRelations);
          
          if (tagError) throw tagError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trada-notes'] });
      setEditingNote(null);
      toast.success('Trading note updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update trading note: ' + error.message);
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('trada_notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trada-notes'] });
      toast.success('Trading note deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete trading note: ' + error.message);
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
    setSelectedTagFilters([]);
    setDateFilter('recent');
  };

  const needsViewMore = (content: string) => {
    return content.length > 150;
  };

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const getTruncatedContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

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

    const handleTagToggle = (tagId: string) => {
      const newSelectedTags = selectedTags.includes(tagId)
        ? selectedTags.filter(id => id !== tagId)
        : [...selectedTags, tagId];
      onTagsChange(newSelectedTags);
    };

    const selectedTagNames = selectedTags.map(tagId => 
      tags.find(tag => tag.id === tagId)?.name
    ).filter(Boolean);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            {selectedTagNames.length > 0 
              ? `${selectedTagNames.length} tag(s) selected`
              : placeholder
            }
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
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
    );
  };

  if (notesLoading) {
    return (
      <Navigation>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading trading notes...</div>
          </div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              TradaNotes
            </h1>
            <p className="text-gray-600 mt-1">Manage your trading notes and strategies</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Trading Note
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search trading notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Service" />
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
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Client" />
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
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Project" />
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

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent (2 months)</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              {/* Enhanced Tag Filter */}
              <Popover open={isTagFilterOpen} onOpenChange={setIsTagFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Tags
                    {selectedTagFilters.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedTagFilters.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-4 border-b">
                    <h4 className="font-medium mb-2">Filter by Tags</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Select tags to show notes that contain ALL selected tags
                    </p>
                    <Input
                      placeholder="Search tags..."
                      value={tagSearchTerm}
                      onChange={(e) => setTagSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {filteredTags.map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={selectedTagFilters.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTagFilters([...selectedTagFilters, tag.id]);
                            } else {
                              setSelectedTagFilters(selectedTagFilters.filter(id => id !== tag.id));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTagFilters([])}
                      className="w-full"
                    >
                      Clear Tag Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {note.title}
                  </CardTitle>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNote({ ...note, selectedTags: note.tags?.map(tag => tag.id) || [] })}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Related Info */}
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  {note.service_name && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {note.service_name}
                    </span>
                  )}
                  {note.client_name && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {note.client_name}
                    </span>
                  )}
                  {note.project_name && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {note.project_name}
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="text-gray-700 text-sm">
                  {expandedNotes.has(note.id) ? (
                    <div>
                      <div className="whitespace-pre-wrap mb-3">{note.content}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleNoteExpansion(note.id)}
                        className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                      >
                        Show Less <ChevronUp className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="whitespace-pre-wrap mb-3">
                        {getTruncatedContent(note.content)}
                      </div>
                      {needsViewMore(note.content) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNoteExpansion(note.id)}
                          className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                        >
                          View More <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-3">
                  Updated {format(new Date(note.updated_at), 'MMM d, yyyy')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trading notes found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || serviceFilter !== 'all' || clientFilter !== 'all' || projectFilter !== 'all' || selectedTagFilters.length > 0
                ? 'Try adjusting your filters to see more results.'
                : 'Create your first trading note to get started.'}
            </p>
            {!searchTerm && serviceFilter === 'all' && clientFilter === 'all' && projectFilter === 'all' && selectedTagFilters.length === 0 && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Trading Note
              </Button>
            )}
          </div>
        )}

        {/* Create Note Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Trading Note</DialogTitle>
              <DialogDescription>
                Add a new trading note with title, content, and optional tags.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Enter trading note title..."
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter your trading notes, strategies, or analysis..."
                  rows={8}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="service">Service</Label>
                  <Select value={newNote.service_id} onValueChange={(value) => setNewNote({ ...newNote, service_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Service</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client">Client</Label>
                  <Select value={newNote.client_id} onValueChange={(value) => setNewNote({ ...newNote, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select value={newNote.project_id} onValueChange={(value) => setNewNote({ ...newNote, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <TagSelector
                  selectedTags={newNote.selectedTags}
                  onTagsChange={(tags) => setNewNote({ ...newNote, selectedTags: tags })}
                  placeholder="Select tags for this trading note..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending}>
                {createNoteMutation.isPending ? 'Creating...' : 'Create Trading Note'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog */}
        {editingNote && (
          <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Trading Note</DialogTitle>
                <DialogDescription>
                  Update your trading note content and details.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    placeholder="Enter trading note title..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-content">Content</Label>
                  <Textarea
                    id="edit-content"
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    placeholder="Enter your trading notes, strategies, or analysis..."
                    rows={8}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-service">Service</Label>
                    <Select 
                      value={editingNote.service_id || 'none'} 
                      onValueChange={(value) => setEditingNote({ ...editingNote, service_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Service</SelectItem>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-client">Client</Label>
                    <Select 
                      value={editingNote.client_id || 'none'} 
                      onValueChange={(value) => setEditingNote({ ...editingNote, client_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Client</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-project">Project</Label>
                    <Select 
                      value={editingNote.project_id || 'none'} 
                      onValueChange={(value) => setEditingNote({ ...editingNote, project_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <TagSelector
                    selectedTags={editingNote.selectedTags || editingNote.tags?.map(tag => tag.id) || []}
                    onTagsChange={(tags) => setEditingNote({ ...editingNote, selectedTags: tags })}
                    placeholder="Select tags for this trading note..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingNote(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateNote({
                  title: editingNote.title,
                  content: editingNote.content,
                  service_id: editingNote.service_id,
                  client_id: editingNote.client_id,
                  project_id: editingNote.project_id,
                  selectedTags: editingNote.selectedTags || []
                })} disabled={updateNoteMutation.isPending}>
                  {updateNoteMutation.isPending ? 'Updating...' : 'Update Trading Note'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Tag Dialog */}
        <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag to organize your trading notes.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name..."
                />
              </div>
              
              <div>
                <Label htmlFor="tag-color">Tag Color</Label>
                <Input
                  id="tag-color"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-full h-10"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateTagDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTag} disabled={createTagMutation.isPending}>
                {createTagMutation.isPending ? 'Creating...' : 'Create Tag'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default TradaNotes; 
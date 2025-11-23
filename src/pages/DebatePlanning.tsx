import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, X, Filter, Bold } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DebateTopic {
  id: string;
  point: string;
  person: string;
  topic_tags: string[];
  section: string;
  position: number;
}

const SECTIONS = [
  { id: 'pro_federalism_arguments', title: "PRO-FEDERALISM: Arguments for Decentralization" },
  { id: 'pro_federalism_rebuttal', title: "PRO-FEDERALISM: Rebuttal Against Unitary State" },
  { id: 'pro_federalism_common_answers', title: "PRO-FEDERALISM: Common Answers for Expected Questions" },
  { id: 'unitary_state_arguments', title: "UNITARY STATE: Arguments for Strong Central Government" },
  { id: 'unitary_state_rebuttal', title: "UNITARY STATE: Rebuttal Against Federalism" },
  { id: 'unitary_state_common_answers', title: "UNITARY STATE: Common Answers for Expected Questions" },
];

const DEFAULT_PEOPLE = ['Yugandhar', 'Rohith', 'Pragnay'];

const PERSON_COLORS = {
  'Yugandhar': 'bg-blue-100 text-blue-800 border-blue-200',
  'Rohith': 'bg-green-100 text-green-800 border-green-200',
  'Pragnay': 'bg-purple-100 text-purple-800 border-purple-200',
};

interface SortableItemProps {
  topic: DebateTopic;
  onEdit: (topic: DebateTopic) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DebateTopic>) => void;
  selectedPerson?: string | null;
}

function SortableItem({ topic, onEdit, onDelete, onUpdate, selectedPerson }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    point: topic.point,
    person: topic.person,
    topic_tags: topic.topic_tags.join(', '),
  });

  const insertBold = () => {
    try {
      const textarea = document.getElementById(`point-textarea-${topic.id}`) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = editData.point.substring(start, end);
      const newText = editData.point.substring(0, start) + `**${selectedText || 'bold text'}**` + editData.point.substring(end);
      
      setEditData({ ...editData, point: newText });
      
      // Restore cursor position
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(start + 2, start + 2 + (selectedText || 'bold text').length);
        }
      }, 0);
    } catch (error) {
      console.error('Error inserting bold text:', error);
    }
  };

  const handleSave = () => {
    onUpdate(topic.id, {
      point: editData.point,
      person: editData.person,
      topic_tags: editData.topic_tags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      point: topic.point,
      person: topic.person,
      topic_tags: topic.topic_tags.join(', '),
    });
    setIsEditing(false);
  };

  const renderFormattedText = (text: string) => {
    // Split text by bold markers and render accordingly
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index} className="font-bold">{boldText}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-white rounded-lg border group hover:bg-gray-50"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab mt-1">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={insertBold}
                    className="h-7 w-7 p-0"
                    title="Bold (select text first)"
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-gray-500">Use **text** for bold formatting</span>
                </div>
                <textarea
                  id={`point-textarea-${topic.id}`}
                  value={editData.point}
                  onChange={(e) => setEditData({ ...editData, point: e.target.value })}
                  placeholder="Enter your point... Use **text** for bold formatting"
                  className="text-sm w-full min-h-[80px] p-3 border rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="sm:w-1/2">
                  <Select
                    value={editData.person}
                    onValueChange={(value) => setEditData({ ...editData, person: value })}
                  >
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_PEOPLE.map(person => (
                        <SelectItem key={person} value={person}>{person}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-1/2">
                  <Input
                    value={editData.topic_tags}
                    onChange={(e) => setEditData({ ...editData, topic_tags: e.target.value })}
                    placeholder="Tags (comma separated)"
                    className="text-sm w-full"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium break-words whitespace-pre-wrap">{renderFormattedText(topic.point)}</div>
              <div className="flex flex-col sm:flex-row gap-2 text-sm">
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  PERSON_COLORS[topic.person as keyof typeof PERSON_COLORS] || 'bg-gray-100 text-gray-800 border-gray-200'
                } ${selectedPerson && selectedPerson !== topic.person ? 'opacity-50' : ''}`}>
                  {topic.person}
                </div>
                <div className="flex flex-wrap gap-1">
                  {topic.topic_tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(topic.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  section: typeof SECTIONS[0];
  topics: DebateTopic[];
  onAddTopic: (section: string) => void;
  onEditTopic: (topic: DebateTopic) => void;
  onDeleteTopic: (id: string) => void;
  onUpdateTopic: (id: string, updates: Partial<DebateTopic>) => void;
  onDragEnd: (event: DragEndEvent, sectionId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  selectedPerson?: string | null;
}

function Section({ 
  section, 
  topics, 
  onAddTopic, 
  onEditTopic, 
  onDeleteTopic, 
  onUpdateTopic,
  onDragEnd, 
  isExpanded, 
  onToggle,
  selectedPerson 
}: SectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{topics.length} items</Badge>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-2 mb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => onDragEnd(event, section.id)}
            >
              <SortableContext
                items={topics.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {topics.map((topic) => (
                  <SortableItem
                    key={topic.id}
                    topic={topic}
                    onEdit={onEditTopic}
                    onDelete={onDeleteTopic}
                    onUpdate={onUpdateTopic}
                    selectedPerson={selectedPerson}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddTopic(section.id)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Point
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function DebatePlanning() {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(SECTIONS.map(s => s.id)));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [newPointData, setNewPointData] = useState({
    point: '',
    person: DEFAULT_PEOPLE[0],
    topic_tags: '',
  });

  // Local state for fallback when Supabase is not available
  const [localTopics, setLocalTopics] = useState<DebateTopic[]>([]);
  const [hasError, setHasError] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const insertBoldNewPoint = () => {
    try {
      const textarea = document.getElementById('new-point-textarea') as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = newPointData.point.substring(start, end);
      const newText = newPointData.point.substring(0, start) + `**${selectedText || 'bold text'}**` + newPointData.point.substring(end);
      
      setNewPointData({ ...newPointData, point: newText });
      
      // Restore cursor position
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(start + 2, start + 2 + (selectedText || 'bold text').length);
        }
      }, 0);
    } catch (error) {
      console.error('Error inserting bold text:', error);
    }
  };

  // Error boundary
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('DebatePlanning page error:', event.error);
      console.error('Error message:', event.error?.message);
      console.error('Error stack:', event.error?.stack);
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Remove favicon for this page - simplified approach
  useEffect(() => {
    // Only run on client side after component mounts
    if (typeof window === 'undefined') return;
    
    try {
      // Find existing favicon
      const existingFavicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      
      // Hide favicon by setting href to empty data URL
      if (existingFavicon) {
        (existingFavicon as HTMLLinkElement).href = 'data:image/svg+xml,';
      }

      // Cleanup function to restore original favicon
      return () => {
        if (existingFavicon && typeof window !== 'undefined') {
          (existingFavicon as HTMLLinkElement).href = '/lovable-uploads/e9bc48ea-efa4-450a-a27a-60e693455b67.png';
        }
      };
    } catch (error) {
      console.warn('Favicon management error:', error);
    }
  }, []);

  const { data: remoteTopics = [], isLoading, error } = useQuery({
    queryKey: ['debate-topics'],
    queryFn: async () => {
      try {
        console.log('Fetching debate topics...');
        
        // Check if supabase is available
        if (!supabase) {
          console.warn('Supabase not available, returning empty data');
          return [];
        }
        
        const { data, error } = await supabase
          .from('debate_topics')
          .select('*')
          .order('position', { ascending: true });
        
        console.log('Supabase response:', { data, error });
        
        if (error) {
          console.error('Supabase error:', error);
          // Return empty data instead of throwing to prevent page crash
          return [];
        }
        
        return data as DebateTopic[];
      } catch (error) {
        console.error('Error fetching debate topics:', error);
        // Return empty data instead of throwing to prevent page crash
        return [];
      }
    },
  });

  // Merge remote and local topics
  const topics = [...remoteTopics, ...localTopics];

  // Extract unique topic tags
  const uniqueTags = React.useMemo(() => {
    const allTags = new Set<string>();
    topics.forEach(topic => {
      topic.topic_tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }, [topics]);

  // Debug logging
  useEffect(() => {
    console.log('DebatePlanning component mounted');
    console.log('Loading state:', isLoading);
    console.log('Error state:', error);
    console.log('Remote topics data:', remoteTopics);
    console.log('Local topics data:', localTopics);
    console.log('Combined topics data:', topics);
    console.log('Supabase available:', !!supabase);
  }, [isLoading, error, topics, remoteTopics, localTopics]);

  const addTopicMutation = useMutation({
    mutationFn: async (newTopic: Omit<DebateTopic, 'id' | 'position'>) => {
      console.log('addTopicMutation called with:', newTopic);
      try {
        // Check if supabase is available
        if (!supabase) {
          console.warn('Supabase not available, creating local topic');
          // Create a local topic with a temporary ID
          const localTopic = {
            id: Date.now().toString(),
            ...newTopic,
            position: 0,
          };
          console.log('Creating local topic:', localTopic);
          // Add to local state immediately
          setLocalTopics(prev => [...prev, localTopic]);
          console.log('Local topics after addition:', [...localTopics, localTopic]);
          return localTopic;
        }
        
        const { data, error } = await supabase
          .from('debate_topics')
          .insert([newTopic])
          .select()
          .single();
        
        if (error) {
          console.error('Supabase error:', error);
          // Create a local topic as fallback
          const localTopic = {
            id: Date.now().toString(),
            ...newTopic,
            position: 0,
          };
          console.log('Creating fallback local topic:', localTopic);
          // Add to local state immediately
          setLocalTopics(prev => [...prev, localTopic]);
          console.log('Local topics after fallback addition:', [...localTopics, localTopic]);
          return localTopic;
        }
        
        console.log('Supabase data returned:', data);
        return data;
      } catch (error) {
        console.error('Error adding topic:', error);
        // Create a local topic as fallback
        const localTopic = {
          id: Date.now().toString(),
          ...newTopic,
          position: 0,
        };
        console.log('Creating error fallback local topic:', localTopic);
        // Add to local state immediately
        setLocalTopics(prev => [...prev, localTopic]);
        console.log('Local topics after error fallback:', [...localTopics, localTopic]);
        return localTopic;
      }
    },
    onSuccess: (data) => {
      console.log('addTopicMutation onSuccess called with:', data);
      queryClient.invalidateQueries({ queryKey: ['debate-topics'] });
      // No need to add to local state here since it's already done in mutationFn
    },
    onError: (error) => {
      console.error('Add topic mutation error:', error);
      setHasError(true);
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DebateTopic> }) => {
      try {
        // Check if supabase is available
        if (!supabase) {
          console.warn('Supabase not available, updating locally');
          // Update local state immediately
          setLocalTopics(prev => prev.map(topic => 
            topic.id === id ? { ...topic, ...updates } : topic
          ));
          return { id, ...updates };
        }
        
        const { data, error } = await supabase
          .from('debate_topics')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('Supabase error:', error);
          // Update local state as fallback
          setLocalTopics(prev => prev.map(topic => 
            topic.id === id ? { ...topic, ...updates } : topic
          ));
          return { id, ...updates };
        }
        
        return data;
      } catch (error) {
        console.error('Error updating topic:', error);
        // Update local state as fallback
        setLocalTopics(prev => prev.map(topic => 
          topic.id === id ? { ...topic, ...updates } : topic
        ));
        return { id, ...updates };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['debate-topics'] });
      // No need to update local state here since it's already done in mutationFn
    },
    onError: (error) => {
      console.error('Update topic mutation error:', error);
      setHasError(true);
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        // Check if supabase is available
        if (!supabase) {
          console.warn('Supabase not available, deleting locally');
          setLocalTopics(prev => prev.filter(topic => topic.id !== id));
          return;
        }
        
        const { error } = await supabase
          .from('debate_topics')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Supabase error:', error);
          // Continue with local deletion
          setLocalTopics(prev => prev.filter(topic => topic.id !== id));
        }
      } catch (error) {
        console.error('Error deleting topic:', error);
        // Continue with local deletion
        setLocalTopics(prev => prev.filter(topic => topic.id !== id));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debate-topics'] });
    },
    onError: (error) => {
      console.error('Delete topic mutation error:', error);
      setHasError(true);
    },
  });

  // Clear all data mutation removed as requested

  const handleAddTopic = (sectionId: string) => {
    console.log('handleAddTopic called with sectionId:', sectionId);
    try {
      // Validate sectionId
      if (!sectionId || typeof sectionId !== 'string') {
        console.error('Invalid sectionId:', sectionId);
        return;
      }
      
      // Validate that section exists
      const sectionExists = SECTIONS.some(s => s.id === sectionId);
      if (!sectionExists) {
        console.error('Section not found:', sectionId);
        return;
      }
      
      setCurrentSection(sectionId);
      setNewPointData({
        point: '',
        person: DEFAULT_PEOPLE[0],
        topic_tags: '',
      });
      console.log('Setting isAddModalOpen to true');
      setIsAddModalOpen(true);
    } catch (error) {
      console.error('Error in handleAddTopic:', error);
      setHasError(true);
    }
  };

  const handleModalSave = () => {
    console.log('handleModalSave called');
    if (!newPointData.point.trim()) {
      console.log('No point text provided, returning');
      return;
    }
    
    const newTopicData = {
      point: newPointData.point.trim(),
      person: newPointData.person,
      topic_tags: newPointData.topic_tags.split(',').map(tag => tag.trim()).filter(Boolean),
      section: currentSection,
      position: topics.filter(t => t.section === currentSection).length,
    };
    
    console.log('Adding new topic:', newTopicData);
    console.log('Current section:', currentSection);
    console.log('Current topics count:', topics.length);
    
    addTopicMutation.mutate(newTopicData);
    
    console.log('Closing modal and resetting form');
    setIsAddModalOpen(false);
    setNewPointData({
      point: '',
      person: DEFAULT_PEOPLE[0],
      topic_tags: '',
    });
  };

  const handleModalClose = () => {
    console.log('handleModalClose called');
    setIsAddModalOpen(false);
    setNewPointData({
      point: '',
      person: DEFAULT_PEOPLE[0],
      topic_tags: '',
    });
  };

  const handleUpdateTopic = (id: string, updates: Partial<DebateTopic>) => {
    updateTopicMutation.mutate({ id, updates });
  };

  const handleDeleteTopic = (id: string) => {
    if (window.confirm('Are you sure you want to delete this point?')) {
      deleteTopicMutation.mutate(id);
    }
  };

  const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const sectionTopics = topics.filter(t => t.section === sectionId);
    const oldIndex = sectionTopics.findIndex(t => t.id === active.id);
    const newIndex = sectionTopics.findIndex(t => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sectionTopics, oldIndex, newIndex);
    
    newOrder.forEach((topic, index) => {
      handleUpdateTopic(topic.id, { position: index });
    });
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Clear data functionality removed as requested

  const clearAllFilters = () => {
    setSelectedPerson(null);
  };

  const hasActiveFilters = selectedPerson !== null;

  // Clear data mutation removed as requested

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-8">Debate Topic Planning</h1>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || hasError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
            <p className="text-gray-600 mb-4">
              {error ? `Error: ${error.message}` : 'There was an error loading the debate planning page.'}
            </p>
            {error && (
              <details className="mb-4 text-left max-w-2xl mx-auto">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto text-left">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Federalism vs Unitary State Debate Planning</h1>
              <p className="text-gray-600 mt-2">Plan and organize arguments for Decentralization & Strengthening Federalism vs Unitary State (Strong Central Government)</p>
              {selectedPerson && (
                <div className="mt-2 text-sm text-blue-600">
                  Filter active: Person: {selectedPerson}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Person Filter Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter by Person:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPerson === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPerson(null)}
              className="rounded-full"
            >
              All People
            </Button>
            {DEFAULT_PEOPLE.map(person => (
              <Button
                key={person}
                variant={selectedPerson === person ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPerson(person)}
                className={`rounded-full ${PERSON_COLORS[person as keyof typeof PERSON_COLORS]}`}
              >
                {person}
              </Button>
            ))}
          </div>
        </div>

        {/* Tag filter removed as requested - only person filters remain */}

        <div className="grid gap-4">
          {SECTIONS.map((section) => {
            const sectionTopics = topics.filter(t => {
              const matchesSection = t.section === section.id;
              const matchesPerson = !selectedPerson || t.person === selectedPerson;
              return matchesSection && matchesPerson;
            });
            
            console.log(`Section ${section.id} topics:`, sectionTopics.length, sectionTopics);
            
            return (
              <Section
                key={section.id}
                section={section}
                topics={sectionTopics}
                onAddTopic={handleAddTopic}
                onEditTopic={(topic) => {
                  console.log('Edit topic clicked:', topic);
                  // TODO: Implement edit functionality if needed
                }}
                onDeleteTopic={handleDeleteTopic}
                onUpdateTopic={handleUpdateTopic}
                onDragEnd={handleDragEnd}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                selectedPerson={selectedPerson}
              />
            );
          })}
        </div>
      </div>

      {/* Add Point Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        console.log('Dialog onOpenChange called with:', open);
        setIsAddModalOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Point</DialogTitle>
            <DialogDescription>
              Enter the details for the new debate point.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Point</label>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={insertBoldNewPoint}
                  className="h-7 w-7 p-0"
                  title="Bold (select text first)"
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <span className="text-xs text-gray-500">Use **text** for bold formatting</span>
              </div>
              <textarea
                id="new-point-textarea"
                value={newPointData.point}
                onChange={(e) => setNewPointData({ ...newPointData, point: e.target.value })}
                placeholder="Enter your point... Use **text** for bold formatting"
                className="w-full min-h-[100px] p-3 border rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Person</label>
              <Select
                value={newPointData.person}
                onValueChange={(value) => setNewPointData({ ...newPointData, person: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PEOPLE.map(person => (
                    <SelectItem key={person} value={person}>{person}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Topic Tags</label>
              <Input
                value={newPointData.topic_tags}
                onChange={(e) => setNewPointData({ ...newPointData, topic_tags: e.target.value })}
                placeholder="Enter tags separated by commas..."
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={!newPointData.point.trim()}>
              Add Point
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WorkProfile {
  id: string;
  profile_name: string;
  calories_required: number;
}

interface Recipe {
  id: string;
  name: string;
  calories_value: number;
  calories_unit: string;
}

interface MenuEntry {
  id: string;
  date: string;
  meal_type: string;
  recipe_id: string;
  profile_id: string;
  recipes: Recipe;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const DefaultMenu = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  const { data: profiles } = useQuery({
    queryKey: ['work-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_profiles')
        .select('*')
        .order('profile_name');
      
      if (error) throw error;
      return data as WorkProfile[];
    },
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    },
  });

  const { data: menuEntries } = useQuery({
    queryKey: ['default-menu', selectedProfile, currentDate],
    queryFn: async () => {
      if (!selectedProfile) return [];
      
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      const { data, error } = await supabase
        .from('default_menu')
        .select('*, recipes(*)')
        .eq('profile_id', selectedProfile)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data as MenuEntry[];
    },
    enabled: !!selectedProfile,
  });

  const addMenuMutation = useMutation({
    mutationFn: async (data: { date: string; profile_id: string; meal_type: string; recipe_id: string }) => {
      const { error } = await supabase
        .from('default_menu')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-menu'] });
      toast.success('Recipe added to menu');
      setIsDialogOpen(false);
      setSelectedMealType('');
      setSelectedRecipeId('');
    },
    onError: (error) => {
      toast.error('Failed to add recipe to menu');
      console.error(error);
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('default_menu')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-menu'] });
      toast.success('Recipe removed from menu');
    },
    onError: (error) => {
      toast.error('Failed to remove recipe');
      console.error(error);
    },
  });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const handleAddRecipe = () => {
    if (!selectedDate || !selectedProfile || !selectedMealType || !selectedRecipeId) {
      toast.error('Please fill all fields');
      return;
    }

    addMenuMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      profile_id: selectedProfile,
      meal_type: selectedMealType,
      recipe_id: selectedRecipeId,
    });
  };

  const getMenuForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return menuEntries?.filter(entry => entry.date === dateStr) || [];
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold p-2">{day}</div>
        ))}
        {days.map(day => {
          const dayMenu = getMenuForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={`min-h-24 p-2 border rounded cursor-pointer hover:bg-accent transition-colors ${
                !isCurrentMonth ? 'opacity-50' : ''
              }`}
            >
              <div className="font-semibold text-sm mb-1">{format(day, 'd')}</div>
              <div className="text-xs space-y-1">
                {dayMenu.length > 0 ? (
                  <div className="text-muted-foreground">
                    {dayMenu.length} meal{dayMenu.length > 1 ? 's' : ''}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No meals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        {days.map(day => {
          const dayMenu = getMenuForDate(day);
          const menuByType = MEAL_TYPES.reduce((acc, type) => {
            acc[type] = dayMenu.filter(entry => entry.meal_type === type);
            return acc;
          }, {} as Record<string, MenuEntry[]>);

          return (
            <div key={day.toString()} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{format(day, 'EEEE, MMM d')}</h3>
                <Button size="sm" onClick={() => handleDateClick(day)}>
                  Add Meal
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {MEAL_TYPES.map(mealType => (
                  <div key={mealType} className="space-y-2">
                    <h4 className="font-medium text-sm">{mealType}</h4>
                    <div className="space-y-1">
                      {menuByType[mealType].length > 0 ? (
                        menuByType[mealType].map(entry => (
                          <div
                            key={entry.id}
                            className="text-xs p-2 bg-accent rounded flex justify-between items-start group"
                          >
                            <div>
                              <div className="font-medium">{entry.recipes.name}</div>
                              <div className="text-muted-foreground">
                                {entry.recipes.calories_value} kcal
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMenuMutation.mutate(entry.id);
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground">No items</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6">
        <div className="mb-6 space-y-4">
          <h1 className="text-3xl font-bold">Default Menu Calendar</h1>
          
          <div className="flex gap-4 items-center">
            <div className="w-64">
              <Label>Select Profile</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose profile..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.profile_name} ({profile.calories_required} kcal)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!selectedProfile ? (
          <div className="text-center py-12 text-muted-foreground">
            Please select a profile to view the menu
          </div>
        ) : viewMode === 'month' ? (
          renderMonthView()
        ) : (
          renderWeekView()
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add Recipe - {selectedDate && format(selectedDate, 'MMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Meal Type</Label>
                <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recipe</Label>
                <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes?.map(recipe => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name} ({recipe.calories_value} kcal)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAddRecipe}>
                Add Recipe
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default DefaultMenu;

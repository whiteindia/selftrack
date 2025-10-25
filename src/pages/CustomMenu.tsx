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

const CustomMenu = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<Record<string, string[]>>({
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: []
  });

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
    mutationFn: async (entries: { date: string; profile_id: string; meal_type: string; recipe_id: string }[]) => {
      const { error } = await supabase
        .from('default_menu')
        .insert(entries);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-menu'] });
      toast.success('Recipes added to menu');
      setIsDialogOpen(false);
      setSelectedRecipes({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
    },
    onError: (error) => {
      toast.error('Failed to add recipes to menu');
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
    // Load existing recipes for this date
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingEntries = menuEntries?.filter(entry => entry.date === dateStr) || [];
    const recipesByMealType: Record<string, string[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: []
    };
    existingEntries.forEach(entry => {
      if (!recipesByMealType[entry.meal_type].includes(entry.recipe_id)) {
        recipesByMealType[entry.meal_type].push(entry.recipe_id);
      }
    });
    setSelectedRecipes(recipesByMealType);
    setIsDialogOpen(true);
  };

  const handleAddRecipes = () => {
    if (!selectedDate || !selectedProfile) {
      toast.error('Please select a date and profile');
      return;
    }

    const entries: { date: string; profile_id: string; meal_type: string; recipe_id: string }[] = [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    MEAL_TYPES.forEach(mealType => {
      selectedRecipes[mealType].forEach(recipeId => {
        entries.push({
          date: dateStr,
          profile_id: selectedProfile,
          meal_type: mealType,
          recipe_id: recipeId,
        });
      });
    });

    if (entries.length === 0) {
      toast.error('Please select at least one recipe');
      return;
    }

    // First, delete existing entries for this date
    supabase
      .from('default_menu')
      .delete()
      .eq('profile_id', selectedProfile)
      .eq('date', dateStr)
      .then(() => {
        addMenuMutation.mutate(entries);
      });
  };

  const getMenuForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return menuEntries?.filter(entry => entry.date === dateStr) || [];
  };

  const getTotalCalories = (date: Date) => {
    const dayMenu = getMenuForDate(date);
    return dayMenu.reduce((total, entry) => total + (entry.recipes.calories_value || 0), 0);
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
          const totalCalories = getTotalCalories(day);
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
              {totalCalories > 0 && (
                <div className="text-xs font-medium text-primary mb-1">
                  {totalCalories} kcal
                </div>
              )}
              <div className="text-xs space-y-1">
                {dayMenu.length > 0 ? (
                  <div className="text-muted-foreground">
                    {dayMenu.length} item{dayMenu.length > 1 ? 's' : ''}
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
          <h1 className="text-3xl font-bold">Custom Menu Calendar</h1>
          
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Manage Recipes - {selectedDate && format(selectedDate, 'MMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {MEAL_TYPES.map(mealType => (
                <div key={mealType} className="space-y-2">
                  <Label className="text-base font-semibold">{mealType}</Label>
                  <Select
                    value={selectedRecipes[mealType][0] || ''}
                    onValueChange={(value) => {
                      if (value && !selectedRecipes[mealType].includes(value)) {
                        setSelectedRecipes(prev => ({
                          ...prev,
                          [mealType]: [...prev[mealType], value]
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Add ${mealType.toLowerCase()} recipe...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes?.map(recipe => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name} ({recipe.calories_value} kcal)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipes[mealType].map(recipeId => {
                      const recipe = recipes?.find(r => r.id === recipeId);
                      if (!recipe) return null;
                      return (
                        <div
                          key={recipeId}
                          className="flex items-center gap-2 bg-accent px-3 py-1 rounded-full text-sm"
                        >
                          <span>{recipe.name} ({recipe.calories_value} kcal)</span>
                          <button
                            onClick={() => {
                              setSelectedRecipes(prev => ({
                                ...prev,
                                [mealType]: prev[mealType].filter(id => id !== recipeId)
                              }));
                            }}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button className="w-full" onClick={handleAddRecipes}>
                Save Recipes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default CustomMenu;

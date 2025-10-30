import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
  date: number;
  meal_type: string;
  recipe_id: string;
  profile_id: string;
  recipes: Recipe;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Fixed date range for default schedule (day 1-31)
const DEFAULT_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const DefaultSchedule = () => {
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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

  // Auto-select yugandhar (software engineer) profile
  useEffect(() => {
    if (profiles && !selectedProfile) {
      const defaultProfile = profiles.find(
        p => p.profile_name.toLowerCase().includes('yugandhar') && 
             p.profile_name.toLowerCase().includes('software')
      );
      if (defaultProfile) {
        setSelectedProfile(defaultProfile.id);
      }
    }
  }, [profiles, selectedProfile]);

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
    queryKey: ['default-schedule', selectedProfile],
    queryFn: async () => {
      if (!selectedProfile) return [];
      
      // Query for entries with dates from 1-31 (as integers)
      const { data, error } = await supabase
        .from('default_menu')
        .select('*, recipes(*)')
        .eq('profile_id', selectedProfile)
        .in('date', DEFAULT_DAYS);
      
      if (error) throw error;
      return data as MenuEntry[];
    },
    enabled: !!selectedProfile,
  });

  const addMenuMutation = useMutation({
    mutationFn: async (entries: { date: number; profile_id: string; meal_type: string; recipe_id: string }[]) => {
      const { error } = await supabase
        .from('default_menu')
        .insert(entries);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-schedule'] });
      toast.success('Recipes added to schedule');
      setIsDialogOpen(false);
      setSelectedRecipes({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
    },
    onError: (error) => {
      toast.error('Failed to add recipes to schedule');
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
      queryClient.invalidateQueries({ queryKey: ['default-schedule'] });
      toast.success('Recipe removed from schedule');
    },
    onError: (error) => {
      toast.error('Failed to remove recipe');
      console.error(error);
    },
  });

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    // Load existing recipes for this day
    const existingEntries = menuEntries?.filter(entry => entry.date === day) || [];
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
    if (!selectedDay || !selectedProfile) {
      toast.error('Please select a day and profile');
      return;
    }

    const entries: { date: number; profile_id: string; meal_type: string; recipe_id: string }[] = [];

    MEAL_TYPES.forEach(mealType => {
      selectedRecipes[mealType].forEach(recipeId => {
        entries.push({
          date: selectedDay,
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

    // First, delete existing entries for this day
    supabase
      .from('default_menu')
      .delete()
      .eq('profile_id', selectedProfile)
      .eq('date', selectedDay)
      .then(() => {
        addMenuMutation.mutate(entries);
      });
  };

  const getMenuForDay = (day: number) => {
    return menuEntries?.filter(entry => entry.date === day) || [];
  };

  const getTotalCalories = (day: number) => {
    const dayMenu = getMenuForDay(day);
    return dayMenu.reduce((total, entry) => total + (entry.recipes.calories_value || 0), 0);
  };

  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold p-2">{day}</div>
        ))}
        {DEFAULT_DAYS.map(day => {
          const dayMenu = getMenuForDay(day);
          const totalCalories = getTotalCalories(day);
          
          return (
            <div
              key={day}
              onClick={() => handleDayClick(day)}
              className="min-h-24 p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="font-semibold text-sm mb-1">{day}</div>
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
    // Show 4 weeks of 7 days each
    const weeks = Array.from({ length: 4 }, (_, weekIndex) => {
      const startDay = weekIndex * 7 + 1;
      const days = Array.from({ length: 7 }, (_, i) => startDay + i).filter(d => d <= 31);
      return days;
    });

    return (
      <div className="space-y-4">
        {weeks.map((weekDays, weekIndex) => (
          <div key={weekIndex}>
            <h3 className="text-lg font-semibold mb-2">Week {weekIndex + 1}</h3>
            <div className="space-y-4">
              {weekDays.map(day => {
                const dayMenu = getMenuForDay(day);
                const menuByType = MEAL_TYPES.reduce((acc, type) => {
                  acc[type] = dayMenu.filter(entry => entry.meal_type === type);
                  return acc;
                }, {} as Record<string, MenuEntry[]>);

                return (
                  <div key={day} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-semibold">Day {day}</h4>
                      <Button size="sm" onClick={() => handleDayClick(day)}>
                        Add Meal
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {MEAL_TYPES.map(mealType => (
                        <div key={mealType} className="space-y-2">
                          <h5 className="font-medium text-sm">{mealType}</h5>
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
          </div>
        ))}
      </div>
    );
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6">
        <div className="mb-6 space-y-4">
          <h1 className="text-3xl font-bold">Default Schedule</h1>
          <p className="text-muted-foreground">Create a default meal schedule for days 1-31 that can be reused across all months</p>
          
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
        </div>

        {!selectedProfile ? (
          <div className="text-center py-12 text-muted-foreground">
            Please select a profile to view the schedule
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
                Manage Recipes - Day {selectedDay}
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

export default DefaultSchedule;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TheatricalSkillDialog } from "@/components/theatrical/TheatricalSkillDialog";

interface TheatricalSkill {
  id: string;
  skill_category: string;
  specific_skill: string;
  description: string;
  practice_frequency: string;
  start_date: string;
}

export const TheatricalArtsCalContent = () => {
  const [skills, setSkills] = useState<TheatricalSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data, error } = await supabase
        .from("theatrical_arts_skills")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error("Error fetching skills:", error);
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const shouldShowSkill = (skill: TheatricalSkill, date: Date): boolean => {
    const skillStartDate = new Date(skill.start_date);
    skillStartDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < skillStartDate) return false;

    const daysDiff = Math.floor((checkDate.getTime() - skillStartDate.getTime()) / (1000 * 60 * 60 * 24));

    const frequency = skill.practice_frequency.toLowerCase();
    
    if (frequency === "daily") return true;
    if (frequency === "weekly") return daysDiff % 7 === 0;
    if (frequency === "bi-weekly") return daysDiff % 14 === 0;
    if (frequency === "monthly") return checkDate.getDate() === skillStartDate.getDate();
    if (frequency.includes("5x")) {
      const day = checkDate.getDay();
      return day > 0 && day < 6; // Weekdays
    }
    if (frequency.includes("4x")) return daysDiff % 2 === 0 && checkDate.getDay() > 0 && checkDate.getDay() < 6;
    if (frequency.includes("3x")) return daysDiff % 3 === 0;
    if (frequency.includes("2x")) return daysDiff % 4 === 0;
    
    return false;
  };

  const getSkillsForDay = (date: Date) => {
    return skills.filter(skill => {
      if (categoryFilter !== "all" && skill.skill_category !== categoryFilter) {
        return false;
      }
      return shouldShowSkill(skill, date);
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDetailsPanelOpen(true);
  };

  const handleAddSkill = () => {
    setIsAddDialogOpen(true);
  };

  const weekDays = getWeekDays();
  const uniqueCategories = Array.from(new Set(skills.map(s => s.skill_category)));
  const selectedDaySkills = selectedDate ? getSkillsForDay(selectedDate) : [];

  return (
      <div className="container mx-auto px-6 pt-0 pb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Theatrical Arts Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View your theatrical arts practice schedule
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>
                {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading skills...</p>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const daySkills = getSkillsForDay(day);
                  const isToday = new Date().toDateString() === day.toDateString();
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day)}
                      className={`border rounded-lg p-3 min-h-[200px] cursor-pointer hover:bg-accent/50 transition-colors ${
                        isToday ? "bg-primary/5 border-primary" : ""
                      }`}
                    >
                      <div className="font-semibold text-sm mb-2">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        <br />
                        {day.getDate()}
                      </div>
                      <div className="space-y-2">
                        {daySkills.map(skill => (
                          <div
                            key={skill.id}
                            className="text-xs p-2 rounded bg-secondary hover:bg-secondary/80 transition-colors"
                            title={`${skill.specific_skill}\n${skill.description}`}
                          >
                            <div className="font-medium truncate">{skill.specific_skill}</div>
                            <div className="text-muted-foreground truncate">{skill.skill_category}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Button onClick={handleAddSkill} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Skill for This Day
              </Button>
              
              {selectedDaySkills.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No skills scheduled for this day</p>
              ) : (
                <div className="space-y-4">
                  {selectedDaySkills.map(skill => (
                    <Card key={skill.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{skill.specific_skill}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <span className="font-semibold">Category:</span>
                          <p className="text-muted-foreground">{skill.skill_category}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Description:</span>
                          <p className="text-muted-foreground">{skill.description}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Practice Frequency:</span>
                          <p className="text-muted-foreground">{skill.practice_frequency}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <TheatricalSkillDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSkillAdded={fetchSkills}
        />
      </div>
  );
};

const TheatricalArtsCal = () => (
  <Navigation>
    <TheatricalArtsCalContent />
  </Navigation>
);

export default TheatricalArtsCal;

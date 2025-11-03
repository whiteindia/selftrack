import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Baby } from "lucide-react";

const activitiesData = [
  {
    category: "IQ / Brain Development",
    activityName: "Flashcards / Picture Cards",
    description: "Show basic objects, animals, shapes & ask names",
    frequency: "Daily",
    duration: "10 mins",
    toolsNeeded: "Flashcards / mobile app",
    goal: "Improve vocabulary & memory",
    progressNotes: ""
  },
  {
    category: "IQ / Brain Development",
    activityName: "Puzzle Solving",
    description: "Age-appropriate puzzles (3–200 pieces)",
    frequency: "3–4 times/week",
    duration: "20 mins",
    toolsNeeded: "Puzzle sets",
    goal: "Enhances logical reasoning & focus",
    progressNotes: ""
  },
  {
    category: "IQ / Brain Development",
    activityName: "Story Reading & Retelling",
    description: "Read story → ask child to explain",
    frequency: "Daily",
    duration: "15 mins",
    toolsNeeded: "Story books",
    goal: "Builds comprehension & speaking skills",
    progressNotes: ""
  },
  {
    category: "IQ / Brain Development",
    activityName: "Math Games",
    description: "Count apples, toys, etc. in real life",
    frequency: "Daily",
    duration: "10 mins",
    toolsNeeded: "Household items",
    goal: "Builds number sense and IQ",
    progressNotes: ""
  },
  {
    category: "Emotional & Moral Values",
    activityName: "Gratitude Talks",
    description: "Ask: \"What made you happy today?\"",
    frequency: "Daily",
    duration: "5 mins",
    toolsNeeded: "None",
    goal: "Builds positivity & awareness",
    progressNotes: ""
  },
  {
    category: "Emotional & Moral Values",
    activityName: "Helping at Home",
    description: "Assign tiny tasks (fold napkin, bring water)",
    frequency: "Daily",
    duration: "5–10 mins",
    toolsNeeded: "Household",
    goal: "Responsibility & discipline",
    progressNotes: ""
  },
  {
    category: "Emotional & Moral Values",
    activityName: "Sharing Games",
    description: "Play with other kids & practice sharing",
    frequency: "Weekly",
    duration: "20 mins",
    toolsNeeded: "Toys",
    goal: "Improves social bonding & empathy",
    progressNotes: ""
  },
  {
    category: "Emotional & Moral Values",
    activityName: "Prayer / Silence Time",
    description: "Sit silent / positive affirmations",
    frequency: "Daily",
    duration: "2–5 mins",
    toolsNeeded: "Calm music optional",
    goal: "Emotional regulation",
    progressNotes: ""
  },
  {
    category: "Sports & Physical Activities",
    activityName: "Running / Skipping",
    description: "Open space running/sprint",
    frequency: "Daily",
    duration: "15 mins",
    toolsNeeded: "Ground, skipping rope",
    goal: "Stamina & coordination",
    progressNotes: ""
  },
  {
    category: "Sports & Physical Activities",
    activityName: "Ball Games",
    description: "Throw, catch, kick, dribble",
    frequency: "Daily",
    duration: "10 mins",
    toolsNeeded: "Soft ball",
    goal: "Hand-eye coordination",
    progressNotes: ""
  },
  {
    category: "Sports & Physical Activities",
    activityName: "Swimming / Cycling",
    description: "Outdoor skill activity",
    frequency: "2–3 times/week",
    duration: "30 mins",
    toolsNeeded: "Cycle/pool",
    goal: "Confidence + body strength",
    progressNotes: ""
  },
  {
    category: "Sports & Physical Activities",
    activityName: "Yoga for Kids",
    description: "Fun poses (cat, tree, butterfly)",
    frequency: "Daily",
    duration: "5–10 mins",
    toolsNeeded: "Mat",
    goal: "Flexibility & calm mind",
    progressNotes: ""
  },
  {
    category: "Creativity & Skills",
    activityName: "Drawing & Coloring",
    description: "Free drawing + object drawing",
    frequency: "3–4 times/week",
    duration: "20 mins",
    toolsNeeded: "Colors & sheets",
    goal: "Improves attention & imagination",
    progressNotes: ""
  },
  {
    category: "Creativity & Skills",
    activityName: "Music / Dance Time",
    description: "Play songs & dance together",
    frequency: "Daily",
    duration: "10 mins",
    toolsNeeded: "Music system",
    goal: "Happiness + rhythm coordination",
    progressNotes: ""
  },
  {
    category: "Creativity & Skills",
    activityName: "Lego / Block Building",
    description: "Build towers, animals, houses",
    frequency: "Weekly",
    duration: "30 mins",
    toolsNeeded: "Lego blocks",
    goal: "Enhances problem solving & engineering thinking",
    progressNotes: ""
  },
  {
    category: "Communication & Social Skills",
    activityName: "Talk Time (Parent-Child)",
    description: "Ask open questions & listen",
    frequency: "Daily",
    duration: "10 mins",
    toolsNeeded: "None",
    goal: "Builds trust & emotional secure bonding",
    progressNotes: ""
  },
  {
    category: "Communication & Social Skills",
    activityName: "Play Dates",
    description: "Interaction with kids same age",
    frequency: "Weekly",
    duration: "1 hour",
    toolsNeeded: "Park / home",
    goal: "Teamwork & sharing skills",
    progressNotes: ""
  },
  {
    category: "Communication & Social Skills",
    activityName: "Public Speaking Fun",
    description: "Recite poem / story in front of family",
    frequency: "Weekly",
    duration: "10 mins",
    toolsNeeded: "None",
    goal: "Confidence & stage habit",
    progressNotes: ""
  },
  {
    category: "Healthy Habits",
    activityName: "Eating Fruits",
    description: "Introduce one fruit per day",
    frequency: "Daily",
    duration: "Routine time",
    toolsNeeded: "Fruits",
    goal: "Nutrition awareness",
    progressNotes: ""
  },
  {
    category: "Healthy Habits",
    activityName: "Water Drinking Tracker",
    description: "Remind to drink water often",
    frequency: "Daily",
    duration: "Whole day",
    toolsNeeded: "Bottle",
    goal: "Health & hydration",
    progressNotes: ""
  },
  {
    category: "Healthy Habits",
    activityName: "Sleep Routine",
    description: "Fix bedtime & no screens before sleeping",
    frequency: "Daily",
    duration: "Night",
    toolsNeeded: "Calm environment",
    goal: "Improves behavior & memory",
    progressNotes: ""
  }
];

const KidsParenting = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Baby className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Kids & Parenting</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Child Development Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Activity Name</TableHead>
                  <TableHead>Description / How to Do</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tools Needed</TableHead>
                  <TableHead>Goal / Expected Outcome</TableHead>
                  <TableHead>Progress Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesData.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{activity.category}</TableCell>
                    <TableCell>{activity.activityName}</TableCell>
                    <TableCell>{activity.description}</TableCell>
                    <TableCell>{activity.frequency}</TableCell>
                    <TableCell>{activity.duration}</TableCell>
                    <TableCell>{activity.toolsNeeded}</TableCell>
                    <TableCell>{activity.goal}</TableCell>
                    <TableCell>{activity.progressNotes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KidsParenting;

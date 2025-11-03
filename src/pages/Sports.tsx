import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const Sports = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Sports</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sports Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Track sports activities, training schedules, and fitness goals.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sports;

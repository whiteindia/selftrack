import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby } from "lucide-react";

const KidsParenting = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Baby className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Kids & Parenting</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kids & Parenting Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage kids and parenting resources, activities, and schedules.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KidsParenting;

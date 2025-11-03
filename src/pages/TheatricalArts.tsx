import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drama } from "lucide-react";

const TheatricalArts = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Drama className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Theatrical Arts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theatrical Arts Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage theatrical performances, rehearsals, and artistic activities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TheatricalArts;

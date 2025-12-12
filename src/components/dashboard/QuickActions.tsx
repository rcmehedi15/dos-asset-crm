import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  userRole: string | null;
}

export const QuickActions = ({ userRole }: QuickActionsProps) => {
  const navigate = useNavigate();

  if (userRole === "salesman") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-muted-foreground" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate("/leads/new")}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Lead
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate("/lead-list")}
          >
            <Users className="h-4 w-4 mr-2" />
            View My Leads
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate("/reports")}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            My Reports
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-muted-foreground" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => navigate("/leads/new")}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create New Lead
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => navigate("/lead-distribution")}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Leads
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => navigate("/reports")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          View Reports
        </Button>
      </CardContent>
    </Card>
  );
};

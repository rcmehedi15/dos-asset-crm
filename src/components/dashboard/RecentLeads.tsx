import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecentLead {
  id: string;
  name: string;
  phone: string;
  status: string;
  stage: string | null;
  created_at: string;
  project_name: string | null;
}

interface RecentLeadsProps {
  leads: RecentLead[];
  userRole: string | null;
}

export const RecentLeads = ({ leads, userRole }: RecentLeadsProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-accent text-accent-foreground",
      contacted: "bg-primary text-primary-foreground",
      qualified: "bg-warning text-warning-foreground",
      converted: "bg-success text-success-foreground",
      lost: "bg-destructive text-destructive-foreground",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Recent Leads
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(userRole === "salesman" ? "/lead-list" : "/lead-distribution")}
        >
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent leads</p>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <div 
                key={lead.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {lead.project_name || lead.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={getStatusColor(lead.status)} variant="secondary">
                    {lead.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {getTimeAgo(lead.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

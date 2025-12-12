import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, Star, Trash2, Pause, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardStatsProps {
  stats: {
    total: number;
    priority: number;
    topPriority: number;
    junk: number;
    hold: number;
    sold: number;
  };
  userRole: string | null;
  loading: boolean;
}

export const DashboardStats = ({ stats, userRole, loading }: DashboardStatsProps) => {
  const navigate = useNavigate();
  
  const getHref = () => {
    return userRole === "salesman" ? "/lead-list" : "/lead-distribution";
  };

  const statCards = [
    {
      title: "Total Leads",
      value: stats.total,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Priority",
      value: stats.priority,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Top Priority",
      value: stats.topPriority,
      icon: Star,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Junk",
      value: stats.junk,
      icon: Trash2,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Hold",
      value: stats.hold,
      icon: Pause,
      color: "text-secondary-foreground",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Sold",
      value: stats.sold,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse pb-2">
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statCards.map((card) => (
        <Card 
          key={card.title} 
          className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 group"
          onClick={() => navigate(getHref())}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {card.title}
            </CardTitle>
            <div className={`p-1.5 rounded-lg ${card.bgColor} group-hover:scale-110 transition-transform`}>
              <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

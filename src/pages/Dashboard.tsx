import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";

interface Stats {
  total: number;
  priority: number;
  topPriority: number;
  junk: number;
  hold: number;
  sold: number;
}

const Dashboard = () => {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    priority: 0,
    topPriority: 0,
    junk: 0,
    hold: 0,
    sold: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [userRole, user?.id]);

  const fetchStats = async () => {
    try {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("status, priority_status");

      if (error) throw error;

      const newStats = {
        total: leads?.length || 0,
        priority: leads?.filter((l) => l.priority_status === "priority").length || 0,
        topPriority: leads?.filter((l) => l.priority_status === "top_priority").length || 0,
        junk: leads?.filter((l) => l.priority_status === "junk").length || 0,
        hold: leads?.filter((l) => l.priority_status === "hold").length || 0,
        sold: leads?.filter((l) => l.priority_status === "sold").length || 0,
      };

      setStats(newStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your leads and performance
          </p>
        </div>

        {/* Stats Cards */}
        <DashboardStats stats={stats} userRole={userRole} loading={loading} />

        {/* Quick Actions */}
        <QuickActions userRole={userRole} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

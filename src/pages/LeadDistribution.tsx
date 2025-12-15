import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Lead {
  id: string;
  name: string;
  phone: string;
  project_name: string | null;
  source: string;
  stage: string | null;
  assigned_to: string | null;
  created_at: string;
  lead_code: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const LeadDistribution = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const canManageLeads =
    userRole === "admin" || userRole === "digital_marketer";

  useEffect(() => {
    fetchData();
  }, []);

  // Live update for duration badges
  useEffect(() => {
    const interval = setInterval(() => {
      setLeads((prev) => [...prev]);
    }, 60000); // refresh every 1 min

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  /* ============================
     ⏱ Human readable lead duration
  ============================ */
  const getLeadDuration = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);

    if (seconds < 60) {
      return { label: `${seconds} sec`, className: "bg-green-500 text-white" };
    }

    if (minutes < 60) {
      return { label: `${minutes} min`, className: "bg-green-500 text-white" };
    }

    if (hours < 24) {
      return { label: `${hours} hour`, className: "bg-green-500 text-white" };
    }

    if (days < 30) {
      return { label: `${days} day`, className: "bg-green-500 text-white" };
    }

    if (months <= 3) {
      return { label: `${months} month`, className: "bg-yellow-400 text-black" };
    }

    return { label: `${months} month`, className: "bg-red-500 text-white" };
  };

  const stageBadgeColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      MQL: "bg-accent text-accent-foreground",
      SGL: "bg-primary text-primary-foreground",
      Lead: "bg-success text-success-foreground",
      SQL: "bg-warning text-warning-foreground",
    };
    return colors[stage || ""] || "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SL</TableHead>
                <TableHead>LEAD CODE</TableHead>
                <TableHead>CUSTOMER</TableHead>
                <TableHead>MOBILE</TableHead>
                <TableHead>PROJECT</TableHead>
                <TableHead>SOURCE</TableHead>
                <TableHead>STAGE</TableHead>
                <TableHead>DURATION</TableHead>
                <TableHead>AGENT</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead, index) => {
                  const duration = getLeadDuration(lead.created_at);

                  return (
                    <TableRow key={lead.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.lead_code || "-"}</Badge>
                      </TableCell>
                      <TableCell>{lead.name}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>{lead.project_name || "-"}</TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell>
                        <Badge className={stageBadgeColor(lead.stage)}>
                          {lead.stage || "Lead"}
                        </Badge>
                      </TableCell>

                      {/* ✅ Duration */}
                      <TableCell>
                        <Badge className={duration.className}>
                          {duration.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {lead.profiles ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={lead.profiles.avatar_url || ""} />
                              <AvatarFallback>
                                {lead.profiles.full_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            {lead.profiles.full_name}
                          </div>
                        ) : (
                          "Not Assigned"
                        )}
                      </TableCell>

                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          History
                        </Button>

                        {canManageLeads && (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(`/leads/new?edit=${lead.id}`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        {userRole === "admin" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              supabase
                                .from("leads")
                                .delete()
                                .eq("id", lead.id)
                                .then(fetchData)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default LeadDistribution;

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Trash2, Edit, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
    email: string;
    avatar_url: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

const LeadDistribution = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [salespeople, setSalespeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const canManageLeads =
    userRole === "admin" || userRole === "digital_marketer";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const assignedIds =
        leadsData?.map((l) => l.assigned_to).filter(Boolean) as string[];

      let profilesMap: Record<
        string,
        { full_name: string; email: string; avatar_url: string | null }
      > = {};

      if (assignedIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", assignedIds);

        if (data) {
          profilesMap = data.reduce(
            (acc, p) => ({
              ...acc,
              [p.id]: {
                full_name: p.full_name,
                email: p.email,
                avatar_url: p.avatar_url,
              },
            }),
            {}
          );
        }
      }

      const leadsWithProfiles =
        leadsData?.map((lead) => ({
          ...lead,
          profiles: lead.assigned_to
            ? profilesMap[lead.assigned_to]
            : undefined,
        })) || [];

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "salesman");

      const salesIds = roles?.map((r) => r.user_id) || [];

      let salesProfiles: Profile[] = [];
      if (salesIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", salesIds);

        salesProfiles = data as Profile[];
      }

      setLeads(leadsWithProfiles);
      setSalespeople(salesProfiles);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     LEAD DURATION LOGIC
  ====================== */
  const getLeadDuration = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    const months = diffDays / 30;

    if (months <= 1) {
      return {
        label: `${diffDays} days`,
        className: "bg-green-500 text-white",
      };
    }

    if (months <= 3) {
      return {
        label: `${Math.floor(months)} months`,
        className: "bg-yellow-400 text-black",
      };
    }

    return {
      label: `${Math.floor(months)} months`,
      className: "bg-red-500 text-white",
    };
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
                        <Badge variant="outline">
                          {lead.lead_code || "-"}
                        </Badge>
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

                      {/* ✅ DURATION */}
                      <TableCell>
                        <Badge className={duration.className}>
                          {duration.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {lead.profiles ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={lead.profiles.avatar_url || ""}
                              />
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
                        > History
                          <History />
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

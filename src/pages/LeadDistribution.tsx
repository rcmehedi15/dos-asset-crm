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
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("");
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const canManageLeads = userRole === "admin" || userRole === "digital_marketer";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch assigned profiles separately
      const assignedIds = leadsData
        ?.map((l) => l.assigned_to)
        .filter(Boolean) as string[];

      let profilesMap: Record<string, { full_name: string; email: string; avatar_url: string | null }> = {};
      
      if (assignedIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", assignedIds);

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce(
            (acc, p) => ({ ...acc, [p.id]: { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url } }),
            {}
          );
        }
      }

      // Map profiles to leads
      const leadsWithProfiles = leadsData?.map((lead) => ({
        ...lead,
        profiles: lead.assigned_to ? profilesMap[lead.assigned_to] : undefined,
      })) || [];

      // Fetch all salespeople (users with salesman role)
      const { data: salesRolesData, error: salesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "salesman");

      if (salesError) throw salesError;

      const salesUserIds = salesRolesData?.map((r) => r.user_id) || [];
      
      let salesProfiles: Profile[] = [];
      if (salesUserIds.length > 0) {
        const { data: salesProfilesData, error: salesProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", salesUserIds);

        if (!salesProfilesError && salesProfilesData) {
          salesProfiles = salesProfilesData as Profile[];
        }
      }

      setLeads(leadsWithProfiles);
      setSalespeople(salesProfiles);
    } catch (error: any) {
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (leadId: string, salespersonId: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: salespersonId })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Lead transferred successfully!");
      setTransferDialogOpen(false);
      setSelectedLead(null);
      setSelectedSalesperson("");
      fetchData();
    } catch (error: any) {
      toast.error("Error transferring lead");
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Lead deleted successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Error deleting lead");
    }
  };

  const openTransferDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedSalesperson("");
    setTransferDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Manage Leads / My Follow Up List
          </h1>
          <p className="text-muted-foreground mt-1">
            Distribute leads to sales team members
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">SL</TableHead>
                    <TableHead>LEAD CODE</TableHead>
                    <TableHead>CUSTOMER NAME</TableHead>
                    <TableHead>MOBILE</TableHead>
                    <TableHead>PROJECT NAME</TableHead>
                    <TableHead>SOURCE</TableHead>
                    <TableHead>STAGE</TableHead>
                    <TableHead>AGENT</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="animate-pulse">Loading...</div>
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead, index) => (
                      <TableRow key={lead.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{String(index + 1).padStart(2, "0")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {lead.lead_code || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {lead.project_name || "Not specified"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm uppercase">{lead.source.replace("_", " ")}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={stageBadgeColor(lead.stage)}>
                            {lead.stage || "Lead"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.profiles ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={lead.profiles.avatar_url || ""} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {getInitials(lead.profiles.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-success">
                                  {lead.profiles.full_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Department: Sales
                                </span>
                              </div>
                            </div>
                          ) : canManageLeads ? (
                            <Select
                              onValueChange={(value) => handleTransfer(lead.id, value)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {salespeople.map((person) => (
                                  <SelectItem key={person.id} value={person.id}>
                                    {person.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {lead.assigned_to && canManageLeads && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTransferDialog(lead)}
                              >
                                <ArrowRightLeft className="h-4 w-4 mr-1" />
                                Transfer
                              </Button>
                            )}
                            {canManageLeads && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => navigate(`/leads/new?edit=${lead.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/leads/${lead.id}`)}
                            >
                              <History className="h-4 w-4 mr-1" />
                              History
                            </Button>
                            {userRole === "admin" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(lead.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedLead && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedLead.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLead.phone}</p>
                {selectedLead.profiles && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Currently assigned to: <span className="text-foreground">{selectedLead.profiles.full_name}</span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Transfer to</Label>
              <Select
                value={selectedSalesperson}
                onValueChange={setSelectedSalesperson}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople
                    .filter((p) => p.id !== selectedLead?.assigned_to)
                    .map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={person.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {getInitials(person.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {person.full_name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedLead && handleTransfer(selectedLead.id, selectedSalesperson)}
              disabled={!selectedSalesperson}
            >
              Transfer Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LeadDistribution;
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Eye, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  location: string;
  created_at: string;
  assigned_to: string | null;
  stage: string | null;
  project_name: string | null;
  created_by: string;
}

const statusColors: Record<string, string> = {
  new: "bg-accent text-accent-foreground",
  contacted: "bg-primary text-primary-foreground",
  qualified: "bg-warning text-warning-foreground",
  converted: "bg-success text-success-foreground",
  lost: "bg-destructive text-destructive-foreground",
};

const LeadList = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchLeads();
  }, [user?.id]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast.error("Error loading leads");
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", deleteLeadId);

      if (error) throw error;
      
      setLeads(prev => prev.filter(l => l.id !== deleteLeadId));
      toast.success("Lead deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete lead");
      console.error("Error deleting lead:", error);
    } finally {
      setDeleteLeadId(null);
    }
  };

  const canDeleteLead = (lead: Lead) => {
    // Admin can delete any lead
    if (userRole === "admin") return true;
    // Salesman can only delete their own SGL leads
    if (userRole === "salesman" && lead.stage === "SGL" && lead.created_by === user?.id) {
      return true;
    }
    return false;
  };

  const canEditLead = (lead: Lead) => {
    // Salesman can edit SGL leads they created
    return lead.stage === "SGL" && lead.created_by === user?.id;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Leads</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your assigned leads
            </p>
          </div>
          <Button onClick={() => navigate("/leads/new")}>
            Create New Lead
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No leads assigned to you yet</p>
              <Button onClick={() => navigate("/leads/new")}>
                Create Your First Lead
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{lead.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {lead.project_name || lead.location || "No location specified"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusColors[lead.status]}>
                        {lead.status}
                      </Badge>
                      {lead.stage && (
                        <Badge variant="outline">
                          {lead.stage}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{lead.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{lead.phone}</span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        Source: <span className="ml-1 capitalize">{lead.source.replace("_", " ")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEditLead(lead) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/leads/new?edit=${lead.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      {canDeleteLead(lead) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteLeadId(lead.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this lead? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLead}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default LeadList;

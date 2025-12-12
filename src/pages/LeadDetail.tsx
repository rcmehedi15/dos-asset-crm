import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Calendar, User, Mail, Phone, MapPin, DollarSign, Building, Briefcase, Edit2, Save, X } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  sub_source: string | null;
  location: string;
  property_type: string;
  project_name: string | null;
  budget_min: number;
  budget_max: number;
  notes: string;
  created_at: string;
  assigned_to: string | null;
  stage: string | null;
  priority_status: string | null;
  lead_sales_type: string | null;
  customer_occupation: string | null;
  customer_designation: string | null;
  customer_organization: string | null;
  client_name_2: string | null;
  client_phone_2: string | null;
  meeting_type: string | null;
  meeting_date: string | null;
  meeting_time: string | null;
  meeting_notes: string | null;
  customer_address_details: string | null;
  customer_additional_data: string | null;
  lead_code: string | null;
}

interface Activity {
  id: string;
  activity_type: string;
  notes: string;
  created_at: string;
  user_id: string;
}

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityUsers, setActivityUsers] = useState<Record<string, string>>({});
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityNote, setActivityNote] = useState("");
  const [assignedPersonName, setAssignedPersonName] = useState<string | null>(null);
  
  // Edit states for salesman editable fields
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  
  const [editMeeting, setEditMeeting] = useState({
    meeting_type: "",
    meeting_date: "",
    meeting_time: "",
    meeting_notes: "",
  });
  const [editAddress, setEditAddress] = useState({
    customer_address_details: "",
    customer_additional_data: "",
  });
  const [editBudget, setEditBudget] = useState({
    budget_min: "",
    budget_max: "",
  });

  useEffect(() => {
    fetchLeadDetails();
    fetchSalespeople();
  }, [id]);

  const deleteLead = async () => {
    if (!window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Lead deleted successfully");
      navigate("/leads");
    } catch (error: any) {
      toast.error("Error deleting lead: " + error.message);
    }
  };

  const fetchLeadDetails = async () => {
    try {
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      if (leadError) throw leadError;
      setLead(leadData);

      // Initialize edit states
      setEditMeeting({
        meeting_type: leadData.meeting_type || "",
        meeting_date: leadData.meeting_date || "",
        meeting_time: leadData.meeting_time || "",
        meeting_notes: leadData.meeting_notes || "",
      });
      setEditAddress({
        customer_address_details: leadData.customer_address_details || "",
        customer_additional_data: leadData.customer_additional_data || "",
      });
      setEditBudget({
        budget_min: leadData.budget_min?.toString() || "",
        budget_max: leadData.budget_max?.toString() || "",
      });

      // Fetch assigned person name if exists
      if (leadData.assigned_to) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", leadData.assigned_to)
          .maybeSingle();
        
        if (profileData) {
          setAssignedPersonName(profileData.full_name);
        }
      }

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch user names for activities
      if (activitiesData && activitiesData.length > 0) {
        const userIds = [...new Set(activitiesData.map(a => a.user_id))];
        const userMap: Record<string, string> = {};
        
        // Fetch profiles for each user
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (profilesData) {
          profilesData.forEach((p) => {
            userMap[p.id] = p.full_name;
          });
        }
        
        setActivityUsers(userMap);
      }
    } catch (error: any) {
      toast.error("Error loading lead: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalespeople = async () => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "salesman");

      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        setSalespeople(profilesData || []);
      }
    } catch (error) {
      console.error("Error fetching salespeople:", error);
    }
  };

  const updateLeadStatus = async (newStatus: "new" | "contacted" | "qualified" | "converted" | "lost") => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Status Update",
        notes: `Status changed to ${newStatus}`,
      });

      toast.success("Status updated successfully");
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error updating status: " + error.message);
    }
  };

  const updatePriorityStatus = async (newPriorityStatus: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ priority_status: newPriorityStatus })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Priority Update",
        notes: `Priority status changed to ${newPriorityStatus}`,
      });

      toast.success("Priority status updated successfully");
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error updating priority status: " + error.message);
    }
  };

  const assignLead = async (salesmanId: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: salesmanId })
        .eq("id", id);

      if (error) throw error;

      const salesman = salespeople.find(s => s.id === salesmanId);

      await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Assignment",
        notes: `Lead assigned to ${salesman?.full_name || "salesman"}`,
      });

      toast.success("Lead assigned successfully");
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error assigning lead: " + error.message);
    }
  };

  const addActivity = async () => {
    if (!activityNote.trim()) return;

    try {
      const { error } = await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Note",
        notes: activityNote,
      });

      if (error) throw error;

      toast.success("Activity added");
      setActivityNote("");
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error adding activity: " + error.message);
    }
  };

  const handleEditLead = () => {
    navigate(`/leads/new?edit=${id}`);
  };

  // Save meeting schedule
  const saveMeetingSchedule = async () => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          meeting_type: editMeeting.meeting_type || null,
          meeting_date: editMeeting.meeting_date || null,
          meeting_time: editMeeting.meeting_time || null,
          meeting_notes: editMeeting.meeting_notes || null,
        })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Meeting Updated",
        notes: `Meeting schedule updated`,
      });

      toast.success("Meeting schedule updated");
      setIsEditingMeeting(false);
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error updating meeting: " + error.message);
    }
  };

  // Save customer address
  const saveCustomerAddress = async () => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          customer_address_details: editAddress.customer_address_details || null,
          customer_additional_data: editAddress.customer_additional_data || null,
        })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Address Updated",
        notes: `Customer address updated`,
      });

      toast.success("Customer address updated");
      setIsEditingAddress(false);
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error updating address: " + error.message);
    }
  };

  // Save budget
  const saveBudget = async () => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          budget_min: editBudget.budget_min ? parseFloat(editBudget.budget_min) : null,
          budget_max: editBudget.budget_max ? parseFloat(editBudget.budget_max) : null,
        })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("lead_activities").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "Budget Updated",
        notes: `Budget information updated`,
      });

      toast.success("Budget information updated");
      setIsEditingBudget(false);
      fetchLeadDetails();
    } catch (error: any) {
      toast.error("Error updating budget: " + error.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Lead not found</p>
          <Button onClick={() => navigate("/leads")} className="mt-4">
            Back to Leads
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const canUpdateStatus = userRole === "admin" || userRole === "salesman";
  const canAssign = userRole === "admin" || userRole === "digital_marketer";
  const canEdit = userRole === "admin" || userRole === "digital_marketer";
  const canEditSalesmanFields = userRole === "salesman" || userRole === "admin" || userRole === "digital_marketer";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{lead.name}</h1>
            <p className="text-muted-foreground mt-1">Lead Code: {lead.lead_code || "N/A"}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge
              className={`text-lg px-4 py-1 ${
                lead.status === "converted"
                  ? "bg-success text-success-foreground"
                  : lead.status === "qualified"
                  ? "bg-warning text-warning-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {lead.status}
            </Badge>
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEditLead}
              >
                Edit Lead
              </Button>
            )}
            {userRole === "admin" && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={deleteLead}
              >
                Delete Lead
              </Button>
            )}
          </div>
        </div>

        {/* Lead Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>1. Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Lead ID</p>
                <p className="text-foreground font-medium">{lead.lead_code || lead.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lead Date</p>
                <p className="text-foreground">{new Date(lead.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lead & Sales Type</p>
                <p className="text-foreground capitalize">{lead.lead_sales_type?.replace("_", " ") || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stage</p>
                <Badge variant="secondary">{lead.stage || "N/A"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority Status</p>
                <Badge variant="outline" className="capitalize">{lead.priority_status?.replace("_", " ") || "Not set"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>2. Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Mobile Number</p>
                  <p className="text-foreground">{lead.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="text-foreground">{lead.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{lead.email || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="text-foreground">{lead.customer_organization || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Designation</p>
                  <p className="text-foreground">{lead.customer_designation || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="text-foreground capitalize">{lead.customer_occupation || "N/A"}</p>
              </div>
              {lead.client_name_2 && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Name 2</p>
                  <p className="text-foreground">{lead.client_name_2}</p>
                </div>
              )}
              {lead.client_phone_2 && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Phone 2</p>
                  <p className="text-foreground">{lead.client_phone_2}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>3. Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Project Category</p>
                <p className="text-foreground capitalize">{lead.property_type || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project Area</p>
                <p className="text-foreground capitalize">{lead.location || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project Name</p>
                <p className="text-foreground">{lead.project_name || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Source Section */}
        <Card>
          <CardHeader>
            <CardTitle>4. Lead Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="text-foreground capitalize">{lead.source.replace("_", " ")}</p>
              </div>
              {lead.sub_source && (
                <div>
                  <p className="text-sm text-muted-foreground">Sub Source</p>
                  <p className="text-foreground">{lead.sub_source}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meeting Schedule Section - Editable for Salesman */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>5. Meeting Schedule</CardTitle>
            {canEditSalesmanFields && !isEditingMeeting && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingMeeting(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingMeeting ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Meeting Type</Label>
                    <Select
                      value={editMeeting.meeting_type}
                      onValueChange={(value) => setEditMeeting({...editMeeting, meeting_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="site_visit">Site Visit</SelectItem>
                        <SelectItem value="office_meeting">Office Meeting</SelectItem>
                        <SelectItem value="virtual_meeting">Virtual Meeting</SelectItem>
                        <SelectItem value="phone_call">Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Date</Label>
                    <Input
                      type="date"
                      value={editMeeting.meeting_date}
                      onChange={(e) => setEditMeeting({...editMeeting, meeting_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Time</Label>
                    <Input
                      type="time"
                      value={editMeeting.meeting_time}
                      onChange={(e) => setEditMeeting({...editMeeting, meeting_time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Meeting Notes</Label>
                  <Textarea
                    value={editMeeting.meeting_notes}
                    onChange={(e) => setEditMeeting({...editMeeting, meeting_notes: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveMeetingSchedule}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingMeeting(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Meeting Type</p>
                  <p className="text-foreground capitalize">{lead.meeting_type?.replace("_", " ") || "N/A"}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting Date</p>
                    <p className="text-foreground">{lead.meeting_date || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meeting Time</p>
                  <p className="text-foreground">{lead.meeting_time || "N/A"}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-sm text-muted-foreground">Meeting Notes</p>
                  <p className="text-foreground">{lead.meeting_notes || "No notes"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Address Section - Editable for Salesman */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>6. Customer Address</CardTitle>
            {canEditSalesmanFields && !isEditingAddress && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingAddress(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingAddress ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Address Details</Label>
                  <Textarea
                    value={editAddress.customer_address_details}
                    onChange={(e) => setEditAddress({...editAddress, customer_address_details: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Data</Label>
                  <Textarea
                    value={editAddress.customer_additional_data}
                    onChange={(e) => setEditAddress({...editAddress, customer_additional_data: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveCustomerAddress}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingAddress(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address Details</p>
                    <p className="text-foreground">{lead.customer_address_details || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Additional Data</p>
                  <p className="text-foreground">{lead.customer_additional_data || "N/A"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Section - Editable for Salesman */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>7. Budget Information</CardTitle>
            {canEditSalesmanFields && !isEditingBudget && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingBudget(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingBudget ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Budget Min ($)</Label>
                    <Input
                      type="number"
                      value={editBudget.budget_min}
                      onChange={(e) => setEditBudget({...editBudget, budget_min: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Max ($)</Label>
                    <Input
                      type="number"
                      value={editBudget.budget_max}
                      onChange={(e) => setEditBudget({...editBudget, budget_max: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveBudget}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingBudget(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Budget Range</p>
                  <p className="text-foreground">
                    {lead.budget_min && lead.budget_max
                      ? `$${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}`
                      : "Not specified"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Remarks Section */}
        <Card>
          <CardHeader>
            <CardTitle>8. Lead Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{lead.notes || "No remarks"}</p>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Lead Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-sm mb-2 block">Current Status: <Badge className="ml-2">{lead.status}</Badge></Label>
                <Select value={lead.status} onValueChange={updateLeadStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Priority Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-sm mb-2 block">Current Priority: <Badge variant="secondary" className="ml-2 capitalize">{lead.priority_status?.replace("_", " ") || "Not set"}</Badge></Label>
                <Select value={lead.priority_status || ""} onValueChange={updatePriorityStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="top_priority">Top Priority</SelectItem>
                    <SelectItem value="junk">Junk</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </div>

        {canAssign && (
          <Card>
            <CardHeader>
              <CardTitle>Assign to Salesman</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-sm mb-2 block">
                {assignedPersonName 
                  ? `Currently assigned to: ${assignedPersonName}` 
                  : "Not assigned yet"}
              </Label>
              <Select
                value={lead.assigned_to || ""}
                onValueChange={assignLead}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salesman" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Add a note or activity..."
              value={activityNote}
              onChange={(e) => setActivityNote(e.target.value)}
              rows={3}
            />
            <Button onClick={addActivity}>Add Activity</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No activities yet</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {activityUsers[activity.user_id] || "Unknown User"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · {activity.activity_type}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-1">{activity.notes}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LeadDetail;
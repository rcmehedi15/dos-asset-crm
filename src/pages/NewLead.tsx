import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Plus, Upload, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const NewLead = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [leadCode, setLeadCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  
  // Dialog states
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", category: "", area: "" });
  const [formData, setFormData] = useState({
    // Lead Information
    lead_sales_type: "",
    // Customer Information
    name: "",
    email: "",
    phone: "",
    customer_occupation: "",
    customer_organization: "",
    customer_designation: "",
    client_name_2: "",
    client_phone_2: "",
    // Project Selection
    project_name: "",
    location: "",
    property_type: "",
    // Lead Source
    source: "website",
    // Meeting Schedule
    meeting_type: "",
    meeting_date: "",
    meeting_time: "",
    meeting_notes: "",
    // Budget
    budget_min: "",
    budget_max: "",
    // Customer Address
    customer_address_details: "",
    customer_additional_data: "",
    // Lead Remarks
    notes: "",
    // Stage and Priority
    stage: "MQL",
    priority: "medium",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Set stage based on user role: salesman creates SGL, others create MQL
      const leadStage = userRole === "salesman" ? "SGL" : formData.stage || "MQL";

      const leadData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: formData.source as "website" | "referral" | "social_media" | "phone_call" | "walk_in" | "other",
        location: formData.location || null,
        property_type: formData.property_type || null,
        project_name: formData.project_name || null,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        notes: formData.notes || null,
        lead_sales_type: formData.lead_sales_type || null,
        customer_occupation: formData.customer_occupation || null,
        customer_organization: formData.customer_organization || null,
        customer_designation: formData.customer_designation || null,
        client_name_2: formData.client_name_2 || null,
        client_phone_2: formData.client_phone_2 || null,
        meeting_type: formData.meeting_type || null,
        meeting_date: formData.meeting_date || null,
        meeting_time: formData.meeting_time || null,
        meeting_notes: formData.meeting_notes || null,
        customer_address_details: formData.customer_address_details || null,
        customer_additional_data: formData.customer_additional_data || null,
        stage: leadStage,
        priority: formData.priority,
        priority_status: null,
      };

      if (editId) {
        // Update existing lead
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", editId);

        if (error) throw error;
        toast.success("Lead updated successfully!");
      } else {
        // Insert new lead
        const { error } = await supabase.from("leads").insert({
          ...leadData,
          created_by: user?.id,
          assigned_to: userRole === "salesman" ? user?.id : null,
          status: "new" as const,
        });

        if (error) throw error;
        toast.success("Lead created successfully!");
      }

      navigate("/lead-distribution");
    } catch (error: any) {
      toast.error(`Error ${editId ? "updating" : "creating"} lead: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
    
    if (editId) {
      fetchLeadData();
    }
  }, [editId]);

  const fetchLeadData = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;

      if (data) {
        setLeadCode(data.lead_code);
        setFormData({
          lead_sales_type: data.lead_sales_type || "",
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          customer_occupation: data.customer_occupation || "",
          customer_organization: data.customer_organization || "",
          customer_designation: data.customer_designation || "",
          client_name_2: data.client_name_2 || "",
          client_phone_2: data.client_phone_2 || "",
          project_name: data.project_name || "",
          location: data.location || "",
          property_type: data.property_type || "",
          source: data.source || "website",
          meeting_type: data.meeting_type || "",
          meeting_date: data.meeting_date || "",
          meeting_time: data.meeting_time || "",
          meeting_notes: data.meeting_notes || "",
          budget_min: data.budget_min?.toString() || "",
          budget_max: data.budget_max?.toString() || "",
          customer_address_details: data.customer_address_details || "",
          customer_additional_data: data.customer_additional_data || "",
          notes: data.notes || "",
          stage: data.stage || "MQL",
          priority: data.priority || "medium",
        });
      }
    } catch (error: any) {
      toast.error("Error loading lead data: " + error.message);
    }
  };


  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (!error && data) {
      setProjects(data);
    }
  };


  const handleAddProject = async () => {
    if (!newProject.name) {
      toast.error("Project name is required");
      return;
    }

    const { error } = await supabase
      .from("projects")
      .insert([{ ...newProject, created_by: user?.id }]);

    if (error) {
      toast.error("Failed to create project");
    } else {
      toast.success("Project created successfully");
      setNewProject({ name: "", category: "", area: "" });
      setOpenProjectDialog(false);
      fetchProjects();
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }
      setBulkFile(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file first");
      return;
    }

    setBulkUploading(true);
    try {
      const text = await bulkFile.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const leads = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const lead: any = {
          created_by: user?.id,
          assigned_to: userRole === "salesman" ? user?.id : null,
          status: "new" as const,
          stage: userRole === "salesman" ? "SGL" : "MQL",
          source: "other" as const,
        };

        headers.forEach((header, index) => {
          const value = values[index] || "";
          if (header === "name" || header === "customer name") lead.name = value;
          if (header === "email" || header === "customer email") lead.email = value || `lead${i}@placeholder.com`;
          if (header === "phone" || header === "mobile" || header === "customer mobile") lead.phone = value;
          if (header === "project" || header === "project name") lead.project_name = value;
          if (header === "source") lead.source = value.toLowerCase().replace(" ", "_") || "other";
          if (header === "notes" || header === "remarks") lead.notes = value;
          if (header === "location" || header === "area") lead.location = value;
        });

        if (lead.name && lead.phone) {
          leads.push(lead);
        }
      }

      if (leads.length === 0) {
        toast.error("No valid leads found in the file. Ensure CSV has 'name' and 'phone' columns.");
        return;
      }

      const { error } = await supabase.from("leads").insert(leads);

      if (error) throw error;

      toast.success(`Successfully imported ${leads.length} leads!`);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      navigate("/lead-distribution");
    } catch (error: any) {
      toast.error("Failed to import leads: " + error.message);
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {editId ? `Edit Lead${leadCode ? ` - ${leadCode}` : ""}` : "Create New Lead"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {editId ? "Update lead information" : "Add a new lead to the system"}
          </p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Entry</TabsTrigger>
            <TabsTrigger value="bulk" disabled={!!editId}>Bulk Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Lead Information */}
              <Card>
                <CardHeader>
                  <CardTitle>1. Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Lead ID <span className="text-muted-foreground">(Auto Generated)</span></Label>
                      <Input value={leadCode || "Auto Generated"} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Lead Date <span className="text-muted-foreground">(Auto Generated)</span></Label>
                      <Input value={new Date().toISOString().split('T')[0]} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead_sales_type">Lead & Sales Type</Label>
                      <Select
                        value={formData.lead_sales_type}
                        onValueChange={(value) => handleChange("lead_sales_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_sale">New Sale</SelectItem>
                          <SelectItem value="resale">Resale</SelectItem>
                          <SelectItem value="rental">Rental</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Customer Mobile Number <span className="text-destructive">*</span> <span className="text-muted-foreground">[11 Digits]</span></Label>
                      <Input
                        id="phone"
                        placeholder="01XXXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        maxLength={11}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Customer Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="name"
                        placeholder="Customer Name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="email">Customer Email <span className="text-muted-foreground">[Optional]</span></Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="customeremail@gmail.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_organization">Organization <span className="text-muted-foreground">[Optional]</span></Label>
                      <Input
                        id="customer_organization"
                        placeholder="Customer Organization"
                        value={formData.customer_organization}
                        onChange={(e) => handleChange("customer_organization", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_designation">Designation <span className="text-muted-foreground">[Optional]</span></Label>
                      <Input
                        id="customer_designation"
                        placeholder="Customer Designation"
                        value={formData.customer_designation}
                        onChange={(e) => handleChange("customer_designation", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="client_name_2">Client Name 2 <span className="text-muted-foreground">[Optional]</span></Label>
                      <Input
                        id="client_name_2"
                        placeholder="Customer Name 2"
                        value={formData.client_name_2}
                        onChange={(e) => handleChange("client_name_2", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_phone_2">Client Phone 2 <span className="text-muted-foreground">[Optional | 11 Digit]</span></Label>
                      <Input
                        id="client_phone_2"
                        placeholder="Customer Number 2"
                        value={formData.client_phone_2}
                        onChange={(e) => handleChange("client_phone_2", e.target.value)}
                        maxLength={11}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_occupation">Customer Occupation</Label>
                    <Select
                      value={formData.customer_occupation}
                      onValueChange={(value) => handleChange("customer_occupation", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Occupation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Select Project */}
              <Card>
                <CardHeader>
                  <CardTitle>3. Select Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="property_type">Select Project Category <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.property_type}
                        onValueChange={(value) => handleChange("property_type", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="duplex">Duplex</SelectItem>
                          <SelectItem value="plot">Plot</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Select Project Area <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => handleChange("location", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bashundhara">Bashundhara</SelectItem>
                          <SelectItem value="gulshan">Gulshan</SelectItem>
                          <SelectItem value="banani">Banani</SelectItem>
                          <SelectItem value="uttara">Uttara</SelectItem>
                          <SelectItem value="dhanmondi">Dhanmondi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="project_name">Select Project <span className="text-destructive">*</span></Label>
                        <Dialog open={openProjectDialog} onOpenChange={setOpenProjectDialog}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-7">
                              <Plus className="h-3 w-3 mr-1" />
                              Add New
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add New Project</DialogTitle>
                              <DialogDescription>Create a new project for lead assignment</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Project Name *</Label>
                                <Input
                                  value={newProject.name}
                                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                                  placeholder="Enter project name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                  value={newProject.category}
                                  onValueChange={(value) => setNewProject({...newProject, category: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Apartment">Apartment</SelectItem>
                                    <SelectItem value="Villa">Villa</SelectItem>
                                    <SelectItem value="Duplex">Duplex</SelectItem>
                                    <SelectItem value="Plot">Plot</SelectItem>
                                    <SelectItem value="Commercial">Commercial</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Area</Label>
                                <Input
                                  value={newProject.area}
                                  onChange={(e) => setNewProject({...newProject, area: e.target.value})}
                                  placeholder="e.g., Bashundhara"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setOpenProjectDialog(false)}>Cancel</Button>
                              <Button onClick={handleAddProject}>Add Project</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Select
                        value={formData.project_name}
                        onValueChange={(value) => handleChange("project_name", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.name}>
                              {project.name} {project.area && `(${project.area})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Lead Source */}
              <Card>
                <CardHeader>
                  <CardTitle>4. Lead Source</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Select Lead Source <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) => handleChange("source", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="phone_call">Phone Call</SelectItem>
                        <SelectItem value="walk_in">Walk In</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 5. Meeting Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle>5. Meeting Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="meeting_type">Select Meeting Type <span className="text-muted-foreground">[Optional]</span></Label>
                      <Select
                        value={formData.meeting_type}
                        onValueChange={(value) => handleChange("meeting_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Meeting Type" />
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
                      <Label htmlFor="meeting_date">Select Meeting Date <span className="text-muted-foreground">[Optional]</span></Label>
                      <Input
                        id="meeting_date"
                        type="date"
                        placeholder="YYYY-MM-DD"
                        value={formData.meeting_date}
                        onChange={(e) => handleChange("meeting_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting_time">Select Meeting Time <span className="text-muted-foreground">[Optional]</span></Label>
                      <Input
                        id="meeting_time"
                        type="time"
                        placeholder="HH:MM"
                        value={formData.meeting_time}
                        onChange={(e) => handleChange("meeting_time", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting_notes">Meeting Notes <span className="text-muted-foreground">[Optional]</span></Label>
                    <Textarea
                      id="meeting_notes"
                      placeholder="Any Important Note/Reminder for meeting"
                      value={formData.meeting_notes}
                      onChange={(e) => handleChange("meeting_notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 6. Customer Address */}
              <Card>
                <CardHeader>
                  <CardTitle>6. Customer Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Collapsible>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors">
                      <span className="font-medium">Customer Address Detail</span>
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <Textarea
                        placeholder="Enter detailed address"
                        value={formData.customer_address_details}
                        onChange={(e) => handleChange("customer_address_details", e.target.value)}
                        rows={4}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors">
                      <span className="font-medium">Customer Additional Data</span>
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <Textarea
                        placeholder="Enter additional information"
                        value={formData.customer_additional_data}
                        onChange={(e) => handleChange("customer_additional_data", e.target.value)}
                        rows={4}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              {/* 7. Lead Remarks/Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>7. Lead Remarks/Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Lead Notes/Remarks</Label>
                    <Textarea
                      id="notes"
                      placeholder="Lead Note Goes Here"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budget_min">Budget Min ($)</Label>
                      <Input
                        id="budget_min"
                        type="number"
                        placeholder="100000"
                        value={formData.budget_min}
                        onChange={(e) => handleChange("budget_min", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget_max">Budget Max ($)</Label>
                      <Input
                        id="budget_max"
                        type="number"
                        placeholder="500000"
                        value={formData.budget_max}
                        onChange={(e) => handleChange("budget_max", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} size="lg" className="bg-accent hover:bg-accent/90">
                  {loading ? "Saving..." : editId ? "Update Lead" : "Add Lead"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/lead-distribution")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Bulk Lead Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a CSV file with columns: name, phone, email, project, source, notes, location
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleBulkFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select CSV File
                  </Button>
                </div>

                {bulkFile && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{bulkFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(bulkFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setBulkFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">CSV Format Example:</h4>
                  <code className="text-xs block bg-background p-3 rounded">
                    name,phone,email,project,source,notes,location<br />
                    John Doe,01712345678,john@email.com,Project A,website,Interested in 3BHK,Gulshan<br />
                    Jane Smith,01812345678,jane@email.com,Project B,referral,Budget 50L,Banani
                  </code>
                </div>

                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || bulkUploading}
                  className="w-full"
                  size="lg"
                >
                  {bulkUploading ? "Uploading..." : "Upload Leads"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NewLead;
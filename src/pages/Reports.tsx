import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProjectReport {
  project_name: string;
  area: string;
  category: string;
  mql: number;
  sgl: number;
  total: number;
  priority: number;
  top_priority: number;
  junk: number;
  hold: number;
  sold: number;
}

interface SourceReport {
  source_type: string;
  mql: number;
  sgl: number;
  total: number;
  priority: number;
  top_priority: number;
  junk: number;
  hold: number;
  sold: number;
}

interface SalesPersonReport {
  sales_person: string;
  designation: string;
  mql: number;
  sgl: number;
  total: number;
  priority: number;
  top_priority: number;
  junk: number;
  hold: number;
  sold: number;
}

const Reports = () => {
  const { user, userRole } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([]);
  const [sourceReports, setSourceReports] = useState<SourceReport[]>([]);
  const [salesPersonReports, setSalesPersonReports] = useState<SalesPersonReport[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReports = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];

      // Fetch leads without join
      let query = supabase
        .from("leads")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (userRole === "salesman") {
        query = query.eq("assigned_to", user?.id);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Fetch projects separately
      const { data: projectsData } = await supabase
        .from("projects")
        .select("name, area, category");
      
      const projectsMap = new Map<string, { area: string; category: string }>();
      projectsData?.forEach((p) => {
        projectsMap.set(p.name, { area: p.area || "N/A", category: p.category || "N/A" });
      });

      // Fetch assigned profiles for salesperson report
      const assignedIds = [...new Set(leads?.filter(l => l.assigned_to).map(l => l.assigned_to))] as string[];
      const profilesMap = new Map<string, string>();
      
      if (assignedIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assignedIds);
        
        profilesData?.forEach((p) => {
          profilesMap.set(p.id, p.full_name);
        });
      }

      // Generate Project Report
      const projectMap = new Map<string, ProjectReport>();
      leads?.forEach((lead: any) => {
        const projectName = lead.project_name || "No Project";
        const projectInfo = projectsMap.get(projectName);
        
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            project_name: projectName,
            area: lead.location || projectInfo?.area || "N/A",
            category: lead.property_type || projectInfo?.category || "N/A",
            mql: 0,
            sgl: 0,
            total: 0,
            priority: 0,
            top_priority: 0,
            junk: 0,
            hold: 0,
            sold: 0,
          });
        }
        const project = projectMap.get(projectName)!;
        project.total++;
        if (lead.stage === "MQL") project.mql++;
        if (lead.stage === "SGL") project.sgl++;
        if (lead.priority_status === "priority") project.priority++;
        if (lead.priority_status === "top_priority") project.top_priority++;
        if (lead.priority_status === "junk") project.junk++;
        if (lead.priority_status === "hold") project.hold++;
        if (lead.priority_status === "sold") project.sold++;
      });
      setProjectReports(Array.from(projectMap.values()));

      // Generate Source Report
      const sourceMap = new Map<string, SourceReport>();
      leads?.forEach((lead: any) => {
        const sourceType = lead.source || "unknown";
        if (!sourceMap.has(sourceType)) {
          sourceMap.set(sourceType, {
            source_type: sourceType,
            mql: 0,
            sgl: 0,
            total: 0,
            priority: 0,
            top_priority: 0,
            junk: 0,
            hold: 0,
            sold: 0,
          });
        }
        const source = sourceMap.get(sourceType)!;
        source.total++;
        if (lead.stage === "MQL") source.mql++;
        if (lead.stage === "SGL") source.sgl++;
        if (lead.priority_status === "priority") source.priority++;
        if (lead.priority_status === "top_priority") source.top_priority++;
        if (lead.priority_status === "junk") source.junk++;
        if (lead.priority_status === "hold") source.hold++;
        if (lead.priority_status === "sold") source.sold++;
      });
      setSourceReports(Array.from(sourceMap.values()));

      // Generate Sales Person Report
      const salesPersonMap = new Map<string, SalesPersonReport>();
      leads?.forEach((lead: any) => {
        if (!lead.assigned_to) return;
        const salesPerson = profilesMap.get(lead.assigned_to) || "Unknown";
        if (!salesPersonMap.has(salesPerson)) {
          salesPersonMap.set(salesPerson, {
            sales_person: salesPerson,
            designation: "Sales Person",
            mql: 0,
            sgl: 0,
            total: 0,
            priority: 0,
            top_priority: 0,
            junk: 0,
            hold: 0,
            sold: 0,
          });
        }
        const person = salesPersonMap.get(salesPerson)!;
        person.total++;
        if (lead.stage === "MQL") person.mql++;
        if (lead.stage === "SGL") person.sgl++;
        if (lead.priority_status === "priority") person.priority++;
        if (lead.priority_status === "top_priority") person.top_priority++;
        if (lead.priority_status === "junk") person.junk++;
        if (lead.priority_status === "hold") person.hold++;
        if (lead.priority_status === "sold") person.sold++;
      });
      setSalesPersonReports(Array.from(salesPersonMap.values()));

      toast.success("Reports generated successfully");
    } catch (error: any) {
      toast.error("Error generating reports: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csv = [
      headers.join(","),
      ...data.map((row, index) => {
        return headers.map((h) => {
          const key = h.toLowerCase().replace(/ /g, "_");
          if (key === "sl_no") return index + 1;
          return row[key] || 0;
        }).join(",");
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${year}_${month}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and export comprehensive lead reports
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>

              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2024, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={generateReports} disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                {loading ? "Generating..." : "Generate Reports"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="project" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="project">Project Wise</TabsTrigger>
            <TabsTrigger value="source">Source Wise</TabsTrigger>
            <TabsTrigger value="salesperson">Sales Person Wise</TabsTrigger>
          </TabsList>

          <TabsContent value="project">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Project Wise Lead Report</CardTitle>
                  <Button
                    onClick={() =>
                      exportToCSV(
                        projectReports,
                        "project_wise_report",
                        ["SL No", "Project Name", "Area", "Category", "MQL", "SGL", "Total", "Priority", "Top Priority", "Junk", "Hold", "Sold"]
                      )
                    }
                    variant="outline"
                    disabled={projectReports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SL No</TableHead>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">MQL</TableHead>
                        <TableHead className="text-right">SGL</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Priority</TableHead>
                        <TableHead className="text-right">Top Priority</TableHead>
                        <TableHead className="text-right">Junk</TableHead>
                        <TableHead className="text-right">Hold</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                            No data available. Generate a report to view results.
                          </TableCell>
                        </TableRow>
                      ) : (
                        projectReports.map((report, index) => (
                          <TableRow key={index}>
                            <TableCell>{String(index + 1).padStart(2, "0")}</TableCell>
                            <TableCell className="font-medium">{report.project_name}</TableCell>
                            <TableCell className="capitalize">{report.area}</TableCell>
                            <TableCell className="capitalize">{report.category}</TableCell>
                            <TableCell className="text-right">{report.mql}</TableCell>
                            <TableCell className="text-right">{report.sgl}</TableCell>
                            <TableCell className="text-right font-medium">{report.total}</TableCell>
                            <TableCell className="text-right">{report.priority}</TableCell>
                            <TableCell className="text-right">{report.top_priority}</TableCell>
                            <TableCell className="text-right">{report.junk}</TableCell>
                            <TableCell className="text-right">{report.hold}</TableCell>
                            <TableCell className="text-right">{report.sold}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="source">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Source Wise Lead Report</CardTitle>
                  <Button
                    onClick={() =>
                      exportToCSV(
                        sourceReports,
                        "source_wise_report",
                        ["SL No", "Source Type", "MQL", "SGL", "Total", "Priority", "Top Priority", "Junk", "Hold", "Sold"]
                      )
                    }
                    variant="outline"
                    disabled={sourceReports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SL No</TableHead>
                        <TableHead>Source Type</TableHead>
                        <TableHead className="text-right">MQL</TableHead>
                        <TableHead className="text-right">SGL</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Priority</TableHead>
                        <TableHead className="text-right">Top Priority</TableHead>
                        <TableHead className="text-right">Junk</TableHead>
                        <TableHead className="text-right">Hold</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sourceReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No data available. Generate a report to view results.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sourceReports.map((report, index) => (
                          <TableRow key={index}>
                            <TableCell>{String(index + 1).padStart(2, "0")}</TableCell>
                            <TableCell className="font-medium uppercase">{report.source_type.replace("_", " ")}</TableCell>
                            <TableCell className="text-right">{report.mql}</TableCell>
                            <TableCell className="text-right">{report.sgl}</TableCell>
                            <TableCell className="text-right font-medium">{report.total}</TableCell>
                            <TableCell className="text-right">{report.priority}</TableCell>
                            <TableCell className="text-right">{report.top_priority}</TableCell>
                            <TableCell className="text-right">{report.junk}</TableCell>
                            <TableCell className="text-right">{report.hold}</TableCell>
                            <TableCell className="text-right">{report.sold}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salesperson">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Sales Person Wise Lead Report</CardTitle>
                  <Button
                    onClick={() =>
                      exportToCSV(
                        salesPersonReports,
                        "salesperson_wise_report",
                        ["SL No", "Sales Person", "Designation", "MQL", "SGL", "Total", "Priority", "Top Priority", "Junk", "Hold", "Sold"]
                      )
                    }
                    variant="outline"
                    disabled={salesPersonReports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SL No</TableHead>
                        <TableHead>Sales Person</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-right">MQL</TableHead>
                        <TableHead className="text-right">SGL</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Priority</TableHead>
                        <TableHead className="text-right">Top Priority</TableHead>
                        <TableHead className="text-right">Junk</TableHead>
                        <TableHead className="text-right">Hold</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesPersonReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            No data available. Generate a report to view results.
                          </TableCell>
                        </TableRow>
                      ) : (
                        salesPersonReports.map((report, index) => (
                          <TableRow key={index}>
                            <TableCell>{String(index + 1).padStart(2, "0")}</TableCell>
                            <TableCell className="font-medium">{report.sales_person}</TableCell>
                            <TableCell>{report.designation}</TableCell>
                            <TableCell className="text-right">{report.mql}</TableCell>
                            <TableCell className="text-right">{report.sgl}</TableCell>
                            <TableCell className="text-right font-medium">{report.total}</TableCell>
                            <TableCell className="text-right">{report.priority}</TableCell>
                            <TableCell className="text-right">{report.top_priority}</TableCell>
                            <TableCell className="text-right">{report.junk}</TableCell>
                            <TableCell className="text-right">{report.hold}</TableCell>
                            <TableCell className="text-right">{report.sold}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
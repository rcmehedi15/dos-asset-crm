import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface LeadSource {
  id: string;
  source_name: string;
  sub_sources: string[] | null;
  is_active: boolean;
  created_at: string;
}

const SourceManagement = () => {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [formData, setFormData] = useState({
    source_name: "",
    sub_sources: "",
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error: any) {
      toast.error("Error loading sources: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const subSourcesArray = formData.sub_sources
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (editingSource) {
        const { error } = await supabase
          .from("lead_sources")
          .update({
            source_name: formData.source_name,
            sub_sources: subSourcesArray.length > 0 ? subSourcesArray : null,
          })
          .eq("id", editingSource.id);

        if (error) throw error;
        toast.success("Source updated successfully");
      } else {
        const { error } = await supabase.from("lead_sources").insert({
          source_name: formData.source_name,
          sub_sources: subSourcesArray.length > 0 ? subSourcesArray : null,
        });

        if (error) throw error;
        toast.success("Source created successfully");
      }

      setOpenDialog(false);
      setFormData({ source_name: "", sub_sources: "" });
      setEditingSource(null);
      fetchSources();
    } catch (error: any) {
      toast.error("Error saving source: " + error.message);
    }
  };

  const handleEdit = (source: LeadSource) => {
    setEditingSource(source);
    setFormData({
      source_name: source.source_name,
      sub_sources: source.sub_sources?.join(", ") || "",
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      const { error } = await supabase
        .from("lead_sources")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Source deactivated successfully");
      fetchSources();
    } catch (error: any) {
      toast.error("Error deleting source: " + error.message);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingSource(null);
    setFormData({ source_name: "", sub_sources: "" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Source Management</h1>
            <p className="text-muted-foreground">Manage your lead sources</p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSource ? "Edit Source" : "Add New Source"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="source_name">Source Name</Label>
                  <Input
                    id="source_name"
                    value={formData.source_name}
                    onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sub_sources">Sub Sources (comma separated)</Label>
                  <Input
                    id="sub_sources"
                    placeholder="e.g., Facebook, Instagram, LinkedIn"
                    value={formData.sub_sources}
                    onChange={(e) => setFormData({ ...formData, sub_sources: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSource ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SL</TableHead>
                  <TableHead>Source Name</TableHead>
                  <TableHead>Sub Sources</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No sources found</TableCell>
                  </TableRow>
                ) : (
                  sources.map((source, index) => (
                    <TableRow key={source.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{source.source_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {source.sub_sources?.map((sub, i) => (
                            <Badge key={i} variant="secondary">
                              {sub}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${source.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {source.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(source)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SourceManagement;

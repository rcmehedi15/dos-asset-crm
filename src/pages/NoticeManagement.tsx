import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  Edit,
  Trash2,
  Plus,
  Eye,
  Users,
} from "lucide-react";

interface Notice {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface NoticeRecipient {
  id: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const NoticeManagement = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [recipients, setRecipients] = useState<NoticeRecipient[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetUserId: "all",
  });

  useEffect(() => {
    fetchNotices();
    fetchAllUsers();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("type", "notice")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error: any) {
      console.error("Error fetching notices:", error);
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  const markAsRead = async (noticeId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", noticeId);

      if (error) throw error;

      // Update local state
      setNotices(prev =>
        prev.map(notice =>
          notice.id === noticeId ? { ...notice, is_read: true } : notice
        )
      );
    } catch (error: any) {
      console.error("Error marking notice as read:", error);
    }
  };

  const fetchNoticeRecipients = async (noticeId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("id", noticeId)
        .eq("type", "notice");

      if (error) throw error;
      setRecipients(data || []);
    } catch (error: any) {
      console.error("Error fetching recipients:", error);
    }
  };

  const handleCreateNotice = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      let targetUsers: string[] = [];

      if (formData.targetUserId === "all") {
        targetUsers = allUsers.map(u => u.id);
      } else {
        targetUsers = [formData.targetUserId];
      }

      if (targetUsers.length === 0) {
        toast.error("No users to send notice to");
        return;
      }

      const notificationsToInsert = targetUsers.map(userId => ({
        user_id: userId,
        title: formData.title,
        message: formData.message,
        type: "notice",
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(notificationsToInsert);

      if (error) throw error;

      toast.success("Notice sent successfully");
      setCreateDialogOpen(false);
      setFormData({ title: "", message: "", targetUserId: "all" });
      fetchNotices();
    } catch (error: any) {
      console.error("Failed to send notice:", error);
      toast.error("Failed to send notice: " + (error.message || "Unknown error"));
    }
  };

  const handleEditNotice = async () => {
    if (!selectedNotice || !formData.title || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          title: formData.title,
          message: formData.message,
        })
        .eq("id", selectedNotice.id);

      if (error) throw error;

      toast.success("Notice updated successfully");
      setEditDialogOpen(false);
      setSelectedNotice(null);
      setFormData({ title: "", message: "", targetUserId: "all" });
      fetchNotices();
    } catch (error: any) {
      console.error("Failed to update notice:", error);
      toast.error("Failed to update notice");
    }
  };

  const handleDeleteNotice = async () => {
    if (!selectedNotice) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", selectedNotice.id);

      if (error) throw error;

      toast.success("Notice deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedNotice(null);
      fetchNotices();
    } catch (error: any) {
      console.error("Failed to delete notice:", error);
      toast.error("Failed to delete notice");
    }
  };

  const openEditDialog = (notice: Notice) => {
    setSelectedNotice(notice);
    setFormData({
      title: notice.title,
      message: notice.message,
      targetUserId: "all",
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = async (notice: Notice) => {
    setSelectedNotice(notice);
    await fetchNoticeRecipients(notice.id);
    setViewDialogOpen(true);
  };

  const openDeleteDialog = (notice: Notice) => {
    setSelectedNotice(notice);
    setDeleteDialogOpen(true);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return "Just now";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading notices...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Notice Management</h1>
              <p className="text-muted-foreground">Manage all notices and announcements</p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Send New Notice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No notices found
                    </TableCell>
                  </TableRow>
                ) : (
                  notices.map((notice) => (
                    <TableRow key={notice.id}>
                      <TableCell className="font-medium">{notice.title}</TableCell>
                      <TableCell>{notice.profiles?.full_name || "Unknown"}</TableCell>
                      <TableCell>{getTimeAgo(notice.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={notice.is_read ? "secondary" : "default"}>
                          {notice.is_read ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(notice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(notice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(notice)}
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

        {/* Create Notice Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send New Notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notice title"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Notice message"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Send to</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={formData.targetUserId}
                  onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                >
                  <option value="all">All Users</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNotice}>
                Send Notice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Notice Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notice title"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Notice message"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditNotice}>
                Update Notice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Notice Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedNotice?.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Sent on {selectedNotice ? new Date(selectedNotice.created_at).toLocaleString() : ''}
              </p>
              <p className="whitespace-pre-wrap mb-4">{selectedNotice?.message}</p>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recipients ({recipients.length})
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="text-sm text-muted-foreground">
                      {recipient.profiles?.full_name} ({recipient.profiles?.email})
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Notice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this notice? This action cannot be undone.
                The notice will be removed from all users' notification lists.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteNotice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Notice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default NoticeManagement;
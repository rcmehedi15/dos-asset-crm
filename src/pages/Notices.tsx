import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Edit, Trash, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
}

const Notices = () => {
  const { user, userRole } = useAuth();
  const [notices, setNotices] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notification | null>(null);
  const [viewNoticeDialogOpen, setViewNoticeDialogOpen] = useState(false);
  const [createNoticeDialogOpen, setCreateNoticeDialogOpen] = useState(false);
  const [editNoticeDialogOpen, setEditNoticeDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notification | null>(null);
  const [newNotice, setNewNotice] = useState({ title: "", message: "" });
  const [editNotice, setEditNotice] = useState({ title: "", message: "" });

  useEffect(() => {
    if (user?.id) {
      fetchNotices();
    }
  }, [user?.id]);

  const fetchNotices = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("type", "notice")
        .order("created_at", { ascending: false });

      // If not admin, only show notices for current user
      if (userRole !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotices(data || []);
    } catch (error: unknown) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (noticeId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", noticeId);

      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error marking notice as read:", error);
    }
  };

  const handleNoticeClick = async (notice: Notification) => {
    setSelectedNotice(notice);
    setViewNoticeDialogOpen(true);
    
    // Mark as read if not already read
    if (!notice.is_read) {
      await markAsRead(notice.id);
    }
  };

  const handleEditNotice = (notice: Notification) => {
    if (userRole !== "admin") {
      alert("You do not have permission to edit notices.");
      return;
    }

    setEditingNotice(notice);
    setEditNotice({ title: notice.title, message: notice.message });
    setEditNoticeDialogOpen(true);
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (userRole !== "admin") {
      alert("You do not have permission to delete notices.");
      return;
    }

    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", noticeId);

      if (error) throw error;

      alert("Notice deleted successfully");
      fetchNotices();
    } catch (error: unknown) {
      console.error("Error deleting notice:", error);
      alert("Failed to delete notice");
    }
  };

  const handleUpdateNotice = async () => {
    if (!editingNotice) return;

    if (!editNotice.title.trim() || !editNotice.message.trim()) {
      alert("Please fill in both title and message.");
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ title: editNotice.title, message: editNotice.message })
        .eq("id", editingNotice.id);

      if (error) throw error;

      alert("Notice updated successfully");
      setEditNoticeDialogOpen(false);
      setEditingNotice(null);
      setEditNotice({ title: "", message: "" });
      fetchNotices();
    } catch (error: unknown) {
      console.error("Error updating notice:", error);
      alert("Failed to update notice");
    }
  };
    if (userRole !== "admin") {
      alert("You do not have permission to create notices.");
      return;
    }

    if (!newNotice.title.trim() || !newNotice.message.trim()) {
      alert("Please fill in both title and message.");
      return;
    }

    try {
      // Get all users to send notice to
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id");

      if (usersError) throw usersError;

      const notificationsToInsert = users.map(userData => ({
        user_id: userData.id,
        title: newNotice.title,
        message: newNotice.message,
        type: "notice",
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(notificationsToInsert);

      if (error) throw error;

      alert("Notice created successfully");
      setCreateNoticeDialogOpen(false);
      setNewNotice({ title: "", message: "" });
      fetchNotices();
    } catch (error: unknown) {
      console.error("Error creating notice:", error);
      alert("Failed to create notice");
    }
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
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Notices</h1>
            <p className="text-muted-foreground">View all your notices and announcements</p>
          </div>
          {userRole === "admin" && (
            <Button onClick={() => setCreateNoticeDialogOpen(true)} className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Notice
            </Button>
          )}
        </div>

        <div className="grid gap-4">
          {notices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notices yet</h3>
                <p className="text-muted-foreground text-center">
                  When you receive notices from administrators, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            notices.map((notice) => (
              <Card
                key={notice.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notice.is_read ? 'border-l-4 border-l-primary' : ''
                }`}
                onClick={() => handleNoticeClick(notice)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {notice.title}
                        {!notice.is_read && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getTimeAgo(notice.created_at)}
                      </p>
                    </div>
                    {userRole === "admin" && (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditNotice(notice)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNotice(notice.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{notice.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* View Notice Dialog */}
      <Dialog open={viewNoticeDialogOpen} onOpenChange={setViewNoticeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNotice?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Sent on {selectedNotice ? new Date(selectedNotice.created_at).toLocaleString() : ''}
            </p>
            <p className="whitespace-pre-wrap">{selectedNotice?.message}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewNoticeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Notice Dialog */}
      <Dialog open={createNoticeDialogOpen} onOpenChange={setCreateNoticeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Notice</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newNotice.title}
                onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                placeholder="Enter notice title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newNotice.message}
                onChange={(e) => setNewNotice({ ...newNotice, message: e.target.value })}
                placeholder="Enter notice message"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateNoticeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNotice}>
              Create Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Notices;
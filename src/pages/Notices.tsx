import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
}

const Notices = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchNotices();
    }
  }, [user?.id]);

  const fetchNotices = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "notice")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error: any) {
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
                onClick={() => !notice.is_read && markAsRead(notice.id)}
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
    </DashboardLayout>
  );
};

export default Notices;
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageSquare,
  Plus,
  Send,
  Users,
  Settings,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface GroupMember {
  id: string;
  user_id: string;
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

const Messenger = () => {
  const { user, userRole } = useAuth();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canManageGroups = userRole === "admin" || userRole === "digital_marketer";

  useEffect(() => {
    fetchGroups();
    if (canManageGroups) {
      fetchAllUsers();
    }
  }, [canManageGroups]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      fetchMembers();
      subscribeToMessages();
    }
  }, [selectedGroup?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGroups(data || []);
      
      if (data && data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedGroup) return;

    try {
      const { data: messagesData, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("group_id", selectedGroup.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set(messagesData?.map((m) => m.sender_id) || [])];
      
      let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", senderIds);

        if (profilesData) {
          profilesMap = profilesData.reduce(
            (acc, p) => ({ ...acc, [p.id]: { full_name: p.full_name, avatar_url: p.avatar_url } }),
            {}
          );
        }
      }

      const messagesWithSenders = messagesData?.map((msg) => ({
        ...msg,
        sender: profilesMap[msg.sender_id],
      })) || [];

      setMessages(messagesWithSenders);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchMembers = async () => {
    if (!selectedGroup) return;

    try {
      const { data: membersData, error } = await supabase
        .from("chat_group_members")
        .select("*")
        .eq("group_id", selectedGroup.id);

      if (error) throw error;

      const userIds = membersData?.map((m) => m.user_id) || [];
      
      let profilesMap: Record<string, UserProfile> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = profilesData.reduce(
            (acc, p) => ({ ...acc, [p.id]: p }),
            {}
          );
        }
      }

      const membersWithProfiles = membersData?.map((member) => ({
        ...member,
        profile: profilesMap[member.user_id],
      })) || [];

      setMembers(membersWithProfiles);
    } catch (error: any) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url");

    if (!error && data) {
      setAllUsers(data);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel(`messages-${selectedGroup.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `group_id=eq.${selectedGroup.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender: profile || undefined },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !user?.id) return;

    try {
      const { error } = await supabase.from("chat_messages").insert({
        group_id: selectedGroup.id,
        sender_id: user.id,
        message: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user?.id) return;

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from("chat_groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      if (!groupData || !groupData.id) {
        throw new Error("Group creation failed: No group ID returned");
      }

      // Add selected members
      const membersToAdd = [...selectedUsers, user.id].map((userId) => ({
        group_id: groupData.id,
        user_id: userId,
      }));

      const { error: membersError } = await supabase
        .from("chat_group_members")
        .insert(membersToAdd);

      if (membersError) throw membersError;

      toast.success("Group created successfully");
      setCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedUsers([]);
      fetchGroups();
    } catch (error: unknown) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;

    try {
      const membersToAdd = selectedUsers.map((userId) => ({
        group_id: selectedGroup.id,
        user_id: userId,
      }));

      const { error } = await supabase
        .from("chat_group_members")
        .insert(membersToAdd);

      if (error) throw error;

      toast.success("Members added successfully");
      setMembersDialogOpen(false);
      setSelectedUsers([]);
      fetchMembers();
    } catch (error: any) {
      toast.error("Failed to add members");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const existingMemberIds = members.map((m) => m.user_id);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        {/* Groups Sidebar */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Groups
              </CardTitle>
              {canManageGroups && (
                <Button size="sm" variant="ghost" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedGroup?.id === group.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.name}</p>
                        {group.description && (
                          <p className="text-xs opacity-70 truncate">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No groups yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {members.length} members
                      </p>
                    </div>
                  </div>
                  {canManageGroups && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUsers([]);
                        setMembersDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Members
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {getInitials(message.sender?.full_name || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`max-w-[70%] ${
                              isOwn ? "items-end" : "items-start"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {isOwn ? "You" : message.sender?.full_name || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), "HH:mm")}
                              </span>
                            </div>
                            <div
                              className={`rounded-lg px-3 py-2 ${
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {message.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a group to start chatting</p>
              </div>
            </div>
          )}
        </Card>

        {/* Members Sidebar */}
        {selectedGroup && (
          <Card className="w-64 hidden lg:flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-2">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label>Add Members</Label>
              <ScrollArea className="h-48 border rounded-lg p-2">
                {allUsers
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg"
                    >
                      <Checkbox
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                          }
                        }}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members to {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-64 border rounded-lg p-2">
              {allUsers
                .filter((u) => !existingMemberIds.includes(u.id))
                .map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(u.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, u.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                        }
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                ))}
              {allUsers.filter((u) => !existingMemberIds.includes(u.id)).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  All users are already members
                </p>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0}>
              Add Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Messenger;
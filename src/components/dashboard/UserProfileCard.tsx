import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserProfileCardProps {
  userId: string;
  userEmail: string;
  userRole: string | null;
}

export const UserProfileCard = ({ userId, userEmail, userRole }: UserProfileCardProps) => {
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    phone: string | null;
  } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case "admin": return "bg-destructive text-destructive-foreground";
      case "digital_marketer": return "bg-primary text-primary-foreground";
      case "salesman": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return "User";
    return role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-muted-foreground" />
          My Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {getInitials(profile?.full_name || userEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-semibold text-foreground truncate">
              {profile?.full_name || "User"}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile?.email || userEmail}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Badge className={`${getRoleColor(userRole)} text-xs`}>
                {formatRole(userRole)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

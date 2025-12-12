import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const UserProfile = () => {
  const { user, userRole, signOut } = useAuth();

  if (!user) return null;

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-destructive text-destructive-foreground";
      case "digital_marketer":
        return "bg-primary text-primary-foreground";
      case "salesman":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.email || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-foreground">
              {user.user_metadata?.full_name || user.email?.split("@")[0]}
            </p>
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} text-xs`}>
                {userRole.replace("_", " ")}
              </Badge>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-sm">
          <p className="font-medium text-foreground">
            {user.user_metadata?.full_name || "User"}
          </p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {userRole && (
            <Badge className={`${getRoleColor(userRole)} text-xs mt-1`}>
              Role: {userRole.replace("_", " ")}
            </Badge>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

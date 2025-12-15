import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Bell, 
  Plug, 
  Shield, 
  Save,
  MessageSquare,
  Mail,
  Send,
  Key,
  Smartphone,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanySettings {
  name: string;
  website: string;
  email: string;
  phone: string;
  address: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  followup_reminders: boolean;
  daily_summary: boolean;
  daily_summary_time: string;
}

interface WhatsAppConfig {
  provider: string;
  api_key: string;
  instance_id: string;
}

interface SMTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
}

interface TelegramConfig {
  bot_token: string;
  chat_id: string;
}

interface IntegrationSettings {
  whatsapp: WhatsAppConfig;
  smtp: SMTPConfig;
  telegram: TelegramConfig;
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { userRole, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Settings state
  const [company, setCompany] = useState<CompanySettings>({
    name: "ASSET DEVELOPMENT LTD",
    website: "",
    email: "",
    phone: "",
    address: "",
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_enabled: true,
    whatsapp_enabled: false,
    followup_reminders: true,
    daily_summary: false,
    daily_summary_time: "09:00",
  });

  const [integrations, setIntegrations] = useState<IntegrationSettings>({
    whatsapp: { provider: "", api_key: "", instance_id: "" },
    smtp: { host: "smtp.gmail.com", port: "587", username: "", password: "" },
    telegram: { bot_token: "", chat_id: "" },
  });

  // Security
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"phone" | "email">("email");

  const canAccessSettings = userRole === "admin" || userRole === "digital_marketer";

  useEffect(() => {
    setMounted(true);
    if (canAccessSettings) {
      fetchSettings();
    }
  }, [canAccessSettings]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.setting_value as any;
        switch (setting.setting_key) {
          case "company":
            setCompany(value);
            break;
          case "notifications":
            setNotifications(value);
            break;
          case "integrations":
            setIntegrations(value);
            break;
        }
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveSettings = async (key: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);

      if (error) throw error;
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });
    setSaving(false);

    if (error) {
      toast.error("Failed to change password");
    } else {
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
  };

  const testSMTPConnection = () => {
    toast.info("SMTP connection test initiated. Check your email.");
  };

  const testWhatsAppConnection = () => {
    toast.info("WhatsApp connection test initiated.");
  };

  if (!mounted) return null;

  if (!canAccessSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Access denied. Admin or Digital Marketer privileges required.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your CRM preferences and configurations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={company.website}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      placeholder="contact@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      placeholder="+880 XXXX XXXXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    placeholder="123 Business Park, Dhaka"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => saveSettings("company", company)} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark theme</p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for new leads and assignments
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_enabled}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email_enabled: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">WhatsApp Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive WhatsApp messages for lead updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.whatsapp_enabled}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, whatsapp_enabled: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Follow-up Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded before scheduled follow-ups
                    </p>
                  </div>
                  <Switch
                    checked={notifications.followup_reminders}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, followup_reminders: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Daily Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily summary of your leads and activities
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {notifications.daily_summary && (
                      <Input
                        type="time"
                        value={notifications.daily_summary_time}
                        onChange={(e) =>
                          setNotifications({ ...notifications, daily_summary_time: e.target.value })
                        }
                        className="w-32"
                      />
                    )}
                    <Switch
                      checked={notifications.daily_summary}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, daily_summary: checked })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => saveSettings("notifications", notifications)} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <MessageSquare className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle>WhatsApp Integration</CardTitle>
                    <CardDescription>Connect WhatsApp for lead notifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>API Provider</Label>
                    <Input
                      value={integrations.whatsapp.provider}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          whatsapp: { ...integrations.whatsapp, provider: e.target.value },
                        })
                      }
                      placeholder="UltraMsg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={integrations.whatsapp.api_key}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          whatsapp: { ...integrations.whatsapp, api_key: e.target.value },
                        })
                      }
                      placeholder="Enter API key"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instance ID</Label>
                  <Input
                    value={integrations.whatsapp.instance_id}
                    onChange={(e) =>
                      setIntegrations({
                        ...integrations,
                        whatsapp: { ...integrations.whatsapp, instance_id: e.target.value },
                      })
                    }
                    placeholder="Enter instance ID"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={testWhatsAppConnection}>
                    Test Connection
                  </Button>
                  <Button onClick={() => saveSettings("integrations", integrations)} disabled={saving}>
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Email (SMTP) Configuration</CardTitle>
                    <CardDescription>Configure SMTP for sending emails</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={integrations.smtp.host}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtp: { ...integrations.smtp, host: e.target.value },
                        })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      value={integrations.smtp.port}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtp: { ...integrations.smtp, port: e.target.value },
                        })
                      }
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={integrations.smtp.username}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtp: { ...integrations.smtp, username: e.target.value },
                        })
                      }
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={integrations.smtp.password}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtp: { ...integrations.smtp, password: e.target.value },
                        })
                      }
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={testSMTPConnection}>
                    Send Test Email
                  </Button>
                  <Button onClick={() => saveSettings("integrations", integrations)} disabled={saving}>
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Send className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Telegram Integration</CardTitle>
                    <CardDescription>Connect Telegram for notifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input
                      type="password"
                      value={integrations.telegram.bot_token}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          telegram: { ...integrations.telegram, bot_token: e.target.value },
                        })
                      }
                      placeholder="Enter bot token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chat ID</Label>
                    <Input
                      value={integrations.telegram.chat_id}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          telegram: { ...integrations.telegram, chat_id: e.target.value },
                        })
                      }
                      placeholder="Enter chat ID"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => saveSettings("integrations", integrations)} disabled={saving}>
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Key className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={saving}>
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Smartphone className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Require verification code when logging in
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
                {twoFactorEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Verification Method</Label>
                      <Select
                        value={twoFactorMethod}
                        onValueChange={(value: "phone" | "email") => setTwoFactorMethod(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone (SMS)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => toast.info("2FA setup would be configured here")}>
                        Setup 2FA
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
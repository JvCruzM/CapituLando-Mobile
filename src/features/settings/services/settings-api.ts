import { accountRequest } from "../../../shared/api/account";

export interface Preferences {
  themeMode?: "system" | "light" | "dark";
  fontSize?: "sm" | "md" | "lg";
  dailyReminder?: boolean;
  reminderTime?: string;
  goalAlerts?: boolean;
}
export interface SettingsDocument {
  revision: number;
  value: Preferences;
}
export const settingsKey = (userId: string) => ["settings", userId] as const;
export const loadSettings = (signal: AbortSignal) =>
  accountRequest<SettingsDocument>({ url: "/api/profile/settings", signal });
export const saveSettings = (data: SettingsDocument) =>
  accountRequest<SettingsDocument>({
    url: "/api/profile/settings",
    method: "PUT",
    data,
  });
export const changeEmail = (data: { email: string; currentPassword: string }) =>
  accountRequest<{ message: string }>({
    url: "/api/auth/change-email",
    method: "POST",
    data,
  });

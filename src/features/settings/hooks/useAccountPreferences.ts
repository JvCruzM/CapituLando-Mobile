import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/session";
import { useUIStore } from "../../../shared/store/ui-store";
import { loadSettings, settingsKey } from "../services/settings-api";
import { synchronizeReminder } from "../services/reminder";

export function useAccountPreferences() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const { data } = useQuery({
    queryKey: settingsKey(userId ?? ""),
    queryFn: ({ signal }) => loadSettings(signal),
    enabled: Boolean(userId),
  });
  useEffect(() => {
    if (!userId) {
      void synchronizeReminder().catch(() => undefined);
      return;
    }
    if (!data) return;
    const ui = useUIStore.getState();
    ui.setThemeMode(data.value.themeMode ?? "system");
    ui.setFontSize(data.value.fontSize ?? "md");
    void synchronizeReminder(userId, data.value).catch(() => {
      console.warn(
        "Confira as permissões do lembrete diário nas configurações.",
      );
    });
  }, [data, userId]);
}

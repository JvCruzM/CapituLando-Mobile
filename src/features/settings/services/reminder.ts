import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import type { Preferences } from "./settings-api";

const identifier = "capitulando-daily-writing";
const channelId = "capitulando-writing-reminders";
let version = 0;
let pending: Promise<unknown> = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureReminderChannel() {
  if (Platform.OS === "android" && !isRunningInExpoGo()) {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Lembretes de escrita",
      description: "Lembrete diário para continuar sua história.",
      groupId: "capitulando-reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: false,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
      vibrationPattern: [0, 250],
      enableVibrate: true,
      enableLights: false,
      showBadge: false,
      bypassDnd: false,
      lightColor: "#6750A4",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
    return channelId;
  }
}

export async function requestReminderPermission() {
  await ensureReminderChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Permita notificações no aparelho para ativar o lembrete diário.",
    );
}

export function synchronizeReminder(
  userId?: string,
  preferences?: Preferences,
) {
  const revision = ++version;
  const operation = pending
    .catch(() => undefined)
    .then(async () => {
      if (revision !== version) return;
      await Notifications.cancelScheduledNotificationAsync(identifier);
      if (!userId || !preferences?.dailyReminder || revision !== version)
        return;
      const reminderChannel = await ensureReminderChannel();
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Permita notificações no aparelho para receber o lembrete diário.",
        );
      const [hour, minute] = (preferences.reminderTime ?? "20:00")
        .split(":")
        .map(Number);
      if (
        hour === undefined ||
        minute === undefined ||
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      )
        return;
      if (revision !== version) return;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: "Hora de escrever",
          body: "Reserve um momento para continuar sua história no CapituLando.",
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(reminderChannel ? { channelId: reminderChannel } : {}),
        },
      });
    });
  pending = operation;
  return operation;
}

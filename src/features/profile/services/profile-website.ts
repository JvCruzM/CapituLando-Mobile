import { Linking, Platform } from "react-native";

export function authorWebsite(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export async function openAuthorWebsite(value: string) {
  const url = authorWebsite(value);
  if (!url)
    throw new Error("O site informado no perfil não é um endereço válido.");
  if (Platform.OS === "web") {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    opened?.focus();
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error("Não foi possível abrir o site. Tente novamente.");
  }
}

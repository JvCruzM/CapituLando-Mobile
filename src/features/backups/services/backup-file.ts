import { Platform } from "react-native";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";

export async function chooseBackupFile() {
  if (Platform.OS === "android") {
    const picked = await File.pickFileAsync({ mimeTypes: ["*/*"] });
    if (picked.canceled) return null;
    const file = picked.result;
    if (file.size > 25 * 1024 * 1024)
      throw new Error("O backup deve ter no máximo 25 MB.");
    return { name: file.name, text: await file.text() };
  }
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.size !== undefined && asset.size > 25 * 1024 * 1024)
    throw new Error("O backup deve ter no máximo 25 MB.");
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (info.exists && !info.isDirectory && info.size > 25 * 1024 * 1024)
    throw new Error("O backup deve ter no máximo 25 MB.");
  return {
    name: asset.name,
    text: await FileSystem.readAsStringAsync(asset.uri),
  };
}

export async function saveBackupFile(text: string, name: string) {
  if (Platform.OS === "android") {
    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return "canceled" as const;
    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      name.replace(/\.json$/i, ""),
      "application/json",
    );
    await FileSystem.writeAsStringAsync(uri, text);
    return "saved" as const;
  }
  if (!(await Sharing.isAvailableAsync()) || !FileSystem.cacheDirectory) {
    throw new Error("Não foi possível abrir as opções para salvar o backup.");
  }
  const uri = FileSystem.cacheDirectory + name;
  await FileSystem.writeAsStringAsync(uri, text);
  try {
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: "Salvar backup CapituLando",
    });
    return "shared" as const;
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
      () => undefined,
    );
  }
}

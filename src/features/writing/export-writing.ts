import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { fileName, writingText, writingHtml } from "./export-content";
async function saveFile(title: string, extension: "txt" | "pdf", data: string) {
  const mimeType = extension === "pdf" ? "application/pdf" : "text/plain";
  const encoding =
    extension === "pdf"
      ? FileSystem.EncodingType.Base64
      : FileSystem.EncodingType.UTF8;
  const name = fileName(title) + "_" + Date.now();
  if (Platform.OS === "android") {
    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return;
    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      name,
      mimeType,
    );
    await FileSystem.writeAsStringAsync(uri, data, { encoding });
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
    throw new Error("Não foi possível abrir as opções para salvar o arquivo.");
  const uri = FileSystem.cacheDirectory + name + "." + extension;
  await FileSystem.writeAsStringAsync(uri, data, { encoding });
  try {
    await Sharing.shareAsync(uri, {
      mimeType,
      UTI: extension === "pdf" ? "com.adobe.pdf" : "public.plain-text",
      dialogTitle: "Salvar " + extension.toUpperCase(),
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
      () => undefined,
    );
  }
}
export async function exportWritingAsTxt(title: string, content: string) {
  await saveFile(title, "txt", writingText(title, content));
}
export async function exportWritingAsPdf(
  title: string,
  content: string,
  storyTitle?: string,
) {
  // Print pode gerar o arquivo fora da pasta autorizada do projeto no Expo Go.
  // Escrevemos os bytes retornados no destino autorizado escolhido para exportação.
  const result = await Print.printToFileAsync({
    html: writingHtml(title, content, storyTitle),
    base64: true,
  });
  if (!result.base64)
    throw new Error("Não foi possível gerar os dados do PDF. Tente novamente.");
  await saveFile(title, "pdf", result.base64);
}

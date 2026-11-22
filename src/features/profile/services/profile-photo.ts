import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export async function chooseProfilePhoto(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const context = ImageManipulator.manipulate(picked.assets[0].uri);
  try {
    context.resize({ width: 512 });
    const rendered = await context.renderAsync();
    try {
      const image = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.8,
        base64: true,
      });
      if (!image.base64 || image.base64.length > 1_500_000)
        throw new Error("A imagem é muito grande. Escolha outra foto.");
      return `data:image/jpeg;base64,${image.base64}`;
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}

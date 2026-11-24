import { useState } from "react";
import { Image, View, type StyleProp, type ViewStyle } from "react-native";
import { imageFrame, loadedImageSize } from "./image-frame";
export function UniverseImage({
  uri,
  fit = "contain",
  position = "center",
  style,
}: {
  uri: string;
  fit?: "cover" | "contain";
  position?: "top" | "center" | "bottom";
  style?: StyleProp<ViewStyle>;
}) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState({ width: 0, height: 0 });
  const frame =
    layout.width && layout.height && image.width && image.height
      ? imageFrame(
          layout.width,
          layout.height,
          image.width,
          image.height,
          fit,
          position,
        )
      : { width: "100%" as const, height: "100%" as const, left: 0, top: 0 };
  return (
    <View
      style={[{ width: "100%", aspectRatio: 1, overflow: "hidden" }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout((old) =>
          old.width === width && old.height === height
            ? old
            : { width, height },
        );
      }}
    >
      <Image
        key={uri}
        source={{ uri }}
        resizeMode="contain"
        onLoad={(e) => {
          const dimensions = loadedImageSize(e.nativeEvent);
          if (dimensions) setImage(dimensions);
        }}
        style={[{ position: "absolute" }, frame]}
        accessibilityLabel="Imagem do universo"
      />
    </View>
  );
}

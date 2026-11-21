import { useState } from "react";
import { Image } from "react-native";
import { Avatar } from "react-native-paper";

export function ProfileAvatar({
  uri,
  name,
  size = 80,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState<string>();
  if (uri && failed !== uri)
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`Foto de perfil de ${name}`}
        onError={() => setFailed(uri)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => [...part][0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <Avatar.Text
      size={size}
      label={initials || "?"}
      accessibilityLabel={`Perfil de ${name}`}
    />
  );
}

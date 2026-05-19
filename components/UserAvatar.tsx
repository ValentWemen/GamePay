import React, { useState } from "react";
import { View, Image, Text } from "react-native";

interface Props {
  avatarUrl?: string | null;
  name?: string;
  size?: number;
  bgColor?: string;
}

export default function UserAvatar({
  avatarUrl,
  name,
  size = 36,
  bgColor = "#FFFBEA",
}: Props) {
  const [imgError, setImgError] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || "?";

  const container = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bgColor,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };

  if (avatarUrl && !imgError) {
    return (
      <View style={container}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View style={container}>
      <Text
        style={{
          fontSize: size * 0.42,
          fontWeight: "700",
          color: "#FFA800",
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

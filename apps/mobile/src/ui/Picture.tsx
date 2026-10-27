import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { categoryPicture } from "./images";
import { colors } from "./theme";

/** A scheme's picture: the category's render, or its drawn icon on a tinted tile. Decorative for screen readers. */
export function CategoryPicture({
  category,
  style,
  iconSize = 32,
}: {
  category: string;
  style: StyleProp<ViewStyle>;
  iconSize?: number;
}) {
  const pic = categoryPicture(category);
  return (
    <View style={[styles.box, style]} accessibilityElementsHidden importantForAccessibility="no">
      {"image" in pic ? (
        <Image source={pic.image} style={styles.fill} resizeMode="cover" />
      ) : (
        <Icon name={pic.icon} size={iconSize} color={colors.accentText} weight={1.6} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.tint,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fill: { width: "100%", height: "100%" },
});

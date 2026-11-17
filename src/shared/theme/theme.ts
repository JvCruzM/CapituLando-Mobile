import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#704563",
    background: "#fcf8f2",
    surface: "#fffdf9",
    onBackground: "#292524",
    onSurface: "#3c2639",
    secondary: "#655c63",
  },
};
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#dec1d5",
    background: "#120e17",
    surface: "#221a2b",
    onBackground: "#f5f5f4",
    onSurface: "#f5edf3",
    secondary: "#c6bdc9",
  },
};

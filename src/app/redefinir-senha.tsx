import { useLocalSearchParams } from "expo-router";
import { TokenScreen } from "../features/auth/screens/TokenScreen";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const value = typeof token === "string" ? token : undefined;
  return <TokenScreen key={value ?? ""} mode="reset" token={value} />;
}

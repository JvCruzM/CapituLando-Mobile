import { useLocalSearchParams } from "expo-router";
import { TokenScreen } from "../features/auth/screens/TokenScreen";

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const value = typeof token === "string" ? token : undefined;
  return <TokenScreen key={value ?? ""} mode="verify" token={value} />;
}

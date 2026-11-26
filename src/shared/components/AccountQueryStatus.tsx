import { ActivityIndicator, HelperText } from "react-native-paper";
import { Button } from "./Controls";
import { Screen } from "./Screen";
import { accountErrorMessage } from "../api/account";
import { useAuthStore } from "../../features/auth/session";

export function AccountQueryStatus({
  error,
  retry,
  fetchStatus,
}: {
  error: unknown;
  retry: () => void;
  fetchStatus?: "fetching" | "paused" | "idle";
}) {
  const sessionError = useAuthStore((state) => state.sessionError);
  const message = error
    ? accountErrorMessage(error)
    : fetchStatus === "paused"
      ? "Sem conexão. Verifique a rede e tente novamente."
      : sessionError;
  const retrying = fetchStatus === "fetching";
  return (
    <Screen>
      {message ? (
        <>
          <HelperText type="error" accessibilityLiveRegion="polite">
            {message}
          </HelperText>
          <Button loading={retrying} disabled={retrying} onPress={retry}>
            Tentar novamente
          </Button>
        </>
      ) : (
        <ActivityIndicator accessibilityLabel="Carregando dados da conta" />
      )}
    </Screen>
  );
}

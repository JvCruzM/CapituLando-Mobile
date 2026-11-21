import { ActivityIndicator, Button, HelperText } from "react-native-paper";
import { Screen } from "./Screen";
import { accountErrorMessage } from "../api/account";

export function AccountQueryStatus({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <Screen>
      {error ? (
        <>
          <HelperText type="error">{accountErrorMessage(error)}</HelperText>
          <Button onPress={retry}>Tentar novamente</Button>
        </>
      ) : (
        <ActivityIndicator accessibilityLabel="Carregando dados da conta" />
      )}
    </Screen>
  );
}

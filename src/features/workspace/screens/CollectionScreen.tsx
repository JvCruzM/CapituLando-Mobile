import { useState } from "react";
import { View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { Screen } from "../../../shared/components/Screen";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { accountErrorMessage } from "../../../shared/api/account";
import { useStories } from "../../stories/services/stories-api";
import {
  useWorkspaceSection,
  type WorkspaceGoal,
  type WorkspaceIdea,
} from "../services/workspace-api";

export function CollectionScreen({ section }: { section: "ideas" | "goals" }) {
  const data = useWorkspaceSection<WorkspaceGoal | WorkspaceIdea>(section);
  const stories = useStories();
  const [text, setText] = useState("");
  const [unit, setUnit] = useState("palavras");
  const [current, setCurrent] = useState("0");
  const [target, setTarget] = useState("500");
  const [project, setProject] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const goals = section === "goals";
  const reset = () => {
    setText("");
    setEditing(null);
    setError("");
  };
  const run = async (task: () => Promise<unknown>) => {
    setError("");
    try {
      await task();
    } catch (e) {
      setError(accountErrorMessage(e));
    }
  };
  if (!data.data || !stories.data)
    return (
      <AccountQueryStatus
        error={data.error ?? stories.error}
        fetchStatus={
          data.fetchStatus === "fetching" || stories.fetchStatus === "fetching"
            ? "fetching"
            : "idle"
        }
        retry={() => {
          void data.refetch();
          void stories.refetch();
        }}
      />
    );
  const storyId = stories.data.some((s) => s.id === project)
    ? project
    : stories.data[0]?.id;
  return (
    <Screen>
      <Text variant="headlineMedium">
        {goals ? "Minhas metas" : "Minhas ideias"}
      </Text>
      <Text>Os registros são compartilhados com sua conta no web.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {goals && (
          <Chip
            selected={!project}
            disabled={data.busy}
            onPress={() => setProject("")}
          >
            Sem história vinculada
          </Chip>
        )}
        {stories.data.map((s) => (
          <Chip
            key={s.id}
            selected={goals ? project === s.id : storyId === s.id}
            disabled={data.busy}
            onPress={() => setProject(s.id)}
          >
            {s.title}
          </Chip>
        ))}
      </View>
      {!goals && !storyId ? (
        <Text>Crie uma história antes de adicionar ideias.</Text>
      ) : (
        <>
          <TextInput
            label={goals ? "Título da meta" : "Ideia"}
            value={text}
            onChangeText={setText}
            multiline={!goals}
            disabled={data.busy}
          />
          {goals && (
            <>
              <TextInput
                label="Unidade"
                value={unit}
                onChangeText={setUnit}
                disabled={data.busy}
              />
              <TextInput
                label="Progresso atual"
                keyboardType="number-pad"
                value={current}
                onChangeText={setCurrent}
                disabled={data.busy}
              />
              <TextInput
                label="Objetivo"
                keyboardType="number-pad"
                value={target}
                onChangeText={setTarget}
                disabled={data.busy}
              />
            </>
          )}
          <Button
            mode="contained"
            loading={data.busy}
            disabled={data.busy || !text.trim()}
            onPress={() =>
              void run(async () => {
                if (
                  goals &&
                  (!/^\d+$/.test(current) ||
                    !/^\d+$/.test(target) ||
                    Number(target) < 1 ||
                    !unit.trim())
                )
                  throw new Error(
                    "Informe uma unidade, progresso não negativo e objetivo maior que zero.",
                  );
                const id =
                  editing ??
                  `mobile_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const original = data.items.find((x) => x.id === id);
                const record = goals
                  ? {
                      ...original,
                      id,
                      title: text.trim(),
                      unit: unit.trim(),
                      current: Number(current),
                      target: Number(target),
                      completed: Number(current) >= Number(target),
                      projectId: project || null,
                    }
                  : {
                      ...original,
                      id,
                      content: text.trim(),
                      projectId: storyId!,
                      createdAt:
                        (original as WorkspaceIdea | undefined)?.createdAt ??
                        new Date().toISOString(),
                    };
                await data.update((items) =>
                  editing
                    ? items.map((x) => (x.id === id ? record : x))
                    : [...items, record],
                );
                reset();
              })
            }
          >
            {editing
              ? "Salvar alterações"
              : goals
                ? "Adicionar meta"
                : "Adicionar ideia"}
          </Button>
          {editing && (
            <Button disabled={data.busy} onPress={reset}>
              Cancelar edição
            </Button>
          )}
        </>
      )}
      {(error || data.saveError) && (
        <HelperText type="error">
          {error || accountErrorMessage(data.saveError)}
        </HelperText>
      )}
      {data.error && (
        <HelperText type="error">{accountErrorMessage(data.error)}</HelperText>
      )}
      <Button
        disabled={data.busy || data.isFetching}
        loading={data.isFetching}
        onPress={() => void data.refetch()}
      >
        Atualizar
      </Button>
      {!data.items.length && <Text>Nenhum registro ainda.</Text>}
      {data.items.map((record) => {
        const goal = record as WorkspaceGoal,
          idea = record as WorkspaceIdea;
        return (
          <Card key={record.id}>
            <Card.Content>
              <Text variant="titleMedium">
                {goals ? goal.title : idea.content}
              </Text>
              <Text>
                {stories.data.find((s) => s.id === record.projectId)?.title ??
                  "Sem história vinculada"}
              </Text>
              {goals && (
                <Text>
                  {goal.current} / {goal.target} {goal.unit}
                  {goal.completed ? " — Concluída" : ""}
                </Text>
              )}
            </Card.Content>
            <Card.Actions style={{ flexWrap: "wrap" }}>
              {goals && (
                <Button
                  disabled={data.busy}
                  onPress={() =>
                    void run(() =>
                      data.update((items) =>
                        items.map((x) =>
                          x.id === goal.id
                            ? {
                                ...goal,
                                current: goal.completed ? 0 : goal.target,
                                completed: !goal.completed,
                              }
                            : x,
                        ),
                      ),
                    )
                  }
                >
                  {goal.completed ? "Reabrir" : "Concluir"}
                </Button>
              )}
              <Button
                disabled={data.busy}
                onPress={() => {
                  setEditing(record.id);
                  setText(goals ? goal.title : idea.content);
                  setProject(record.projectId ?? "");
                  if (goals) {
                    setUnit(goal.unit);
                    setCurrent(String(goal.current));
                    setTarget(String(goal.target));
                  }
                }}
              >
                Editar
              </Button>
              <Button
                disabled={data.busy}
                onPress={() => setDeleting(record.id)}
              >
                Excluir
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
      <Portal>
        <Dialog
          visible={Boolean(deleting)}
          dismissable={!data.busy}
          onDismiss={() => setDeleting(null)}
        >
          <Dialog.Title>Excluir registro?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Esta alteração também será aplicada na sua conta no web.
            </Text>
            {error && <HelperText type="error">{error}</HelperText>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={data.busy} onPress={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              loading={data.busy}
              disabled={data.busy}
              onPress={() =>
                void run(async () => {
                  await data.update((items) =>
                    items.filter((x) => x.id !== deleting),
                  );
                  if (editing === deleting) reset();
                  setDeleting(null);
                })
              }
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

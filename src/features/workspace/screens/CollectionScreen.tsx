import { useRef, useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Chip,
  Dialog,
  HelperText,
  Menu,
  Portal,
  Text,
} from "react-native-paper";
import { Button, TextInput } from "../../../shared/components/Controls";
import { Screen } from "../../../shared/components/Screen";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { accountErrorMessage } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
import { useStories } from "../../stories/services/stories-api";
import {
  loadSettings,
  settingsKey,
} from "../../settings/services/settings-api";
import {
  IDEA_CATEGORIES,
  SUGGESTION_KINDS,
  createSuggestion,
  filterIdeas,
  suggestionGenre,
  type SuggestionKind,
} from "../../ideas/idea-tools";
import { GOAL_UNITS, toggleGoal, justCompleted } from "../../goals/goal-tools";
import {
  useWorkspaceSection,
  type WorkspaceGoal,
  type WorkspaceIdea,
} from "../services/workspace-api";

const newId = () =>
  "mobile_" + Date.now() + "_" + Math.random().toString(36).slice(2);
export function CollectionScreen({ section }: { section: "ideas" | "goals" }) {
  const goals = section === "goals";
  const data = useWorkspaceSection<WorkspaceGoal | WorkspaceIdea>(section);
  const stories = useStories();
  const owner = useAuthStore((s) => s.session?.user.id ?? "");
  const settings = useQuery({
    queryKey: settingsKey(owner),
    enabled: goals && Boolean(owner),
    queryFn: ({ signal }) => loadSettings(signal),
  });
  const [text, setText] = useState(""),
    [unit, setUnit] = useState("palavras"),
    [current, setCurrent] = useState("0"),
    [target, setTarget] = useState("500");
  const [project, setProject] = useState(""),
    [category, setCategory] = useState<string>("Geral");
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [filterProject, setFilterProject] = useState(""),
    [filterCategory, setFilterCategory] = useState("");
  const [editing, setEditing] = useState<string | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [suggestion, setSuggestion] = useState<
    (ReturnType<typeof createSuggestion> & { projectId: string }) | null
  >(null);
  const pending = useRef(false);
  const reset = () => {
    setText("");
    setEditing(null);
    setCategory("Geral");
    setCurrent("0");
    setTarget("500");
    setUnit("palavras");
    setError("");
  };
  const run = async (task: () => Promise<void>) => {
    if (pending.current || data.busy) return;
    pending.current = true;
    setError("");
    setNotice("");
    try {
      await task();
    } catch (cause) {
      setError(accountErrorMessage(cause));
    } finally {
      pending.current = false;
    }
  };
  if (!data.data || !stories.data || (goals && !settings.data))
    return (
      <AccountQueryStatus
        error={data.error ?? stories.error ?? (goals ? settings.error : null)}
        fetchStatus={
          [
            data.fetchStatus,
            stories.fetchStatus,
            ...(goals ? [settings.fetchStatus] : []),
          ].includes("fetching")
            ? "fetching"
            : "idle"
        }
        retry={() => {
          void data.refetch();
          void stories.refetch();
          if (goals) void settings.refetch();
        }}
      />
    );
  const storyId = project
    ? stories.data.find((story) => story.id === project)?.id
    : stories.data[0]?.id;
  const selectedStory = stories.data.find((story) => story.id === storyId);
  const visible = goals
    ? data.items
    : filterIdeas(data.items as WorkspaceIdea[], filterProject, filterCategory);
  const categories = [
    ...new Set([
      ...IDEA_CATEGORIES,
      ...(data.items as WorkspaceIdea[]).map(
        (idea) => idea.category?.trim() || "Geral",
      ),
    ]),
  ];
  const alerts = settings.data?.value.goalAlerts !== false;
  const save = async () => {
    if (!text.trim())
      throw new Error(
        goals ? "Informe o título da meta." : "Escreva sua ideia.",
      );
    const id = editing ?? newId();
    const original = data.items.find((item) => item.id === id);
    if (editing && !original)
      throw new Error(
        "Este registro não está mais disponível. Atualize a lista.",
      );
    if (goals) {
      const currentValue = Number(current),
        targetValue = Number(target);
      if (
        !/^\d+$/.test(current) ||
        !/^\d+$/.test(target) ||
        !Number.isSafeInteger(currentValue) ||
        !Number.isSafeInteger(targetValue) ||
        currentValue > 2147483647 ||
        targetValue > 2147483647 ||
        targetValue < 1 ||
        !unit.trim()
      )
        throw new Error(
          "Informe uma unidade, progresso não negativo e objetivo maior que zero.",
        );
      const record: WorkspaceGoal = {
        ...original,
        id,
        title: text.trim(),
        unit: unit.trim(),
        current: currentValue,
        target: targetValue,
        completed: currentValue >= targetValue,
        projectId: project || null,
      };
      await data.update((items) =>
        editing
          ? items.map((item) => (item.id === id ? record : item))
          : [...items, record],
      );
      if (
        alerts &&
        justCompleted(original as WorkspaceGoal | undefined, record)
      )
        setNotice("Parabéns! Meta concluída.");
    } else {
      if (!storyId) throw new Error("Selecione um livro para salvar a ideia.");
      const record: WorkspaceIdea = {
        ...original,
        id,
        content: text.trim(),
        projectId: storyId,
        category: category.trim() || "Geral",
        createdAt:
          (original as WorkspaceIdea | undefined)?.createdAt ??
          new Date().toISOString(),
      };
      await data.update((items) =>
        editing
          ? items.map((item) => (item.id === id ? record : item))
          : [record, ...items],
      );
      setFilterProject(storyId);
      setFilterCategory("");
      setNotice("Ideia salva.");
    }
    reset();
  };
  const generate = (kind: SuggestionKind) => {
    if (!storyId) return;
    setNotice("");
    setSuggestion({
      ...createSuggestion(kind, selectedStory?.genre, suggestion?.text),
      projectId: storyId,
    });
  };
  return (
    <Screen>
      <Text variant="headlineMedium">
        {goals ? "Minhas metas" : "Minhas ideias"}
      </Text>
      <Text>Os registros são compartilhados com sua conta no web.</Text>
      {notice && (!goals || alerts) ? (
        <Card accessibilityRole="alert">
          <Card.Content>
            <Text accessibilityLiveRegion="polite">{notice}</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => setNotice("")}>Fechar aviso</Button>
          </Card.Actions>
        </Card>
      ) : null}
      <Text variant="titleMedium">
        {editing ? "Editar registro" : goals ? "Nova meta" : "Nova ideia"}
      </Text>
      <Text>{goals ? "História vinculada à meta" : "Livro da ideia"}</Text>
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
        {stories.data.map((story) => (
          <Chip
            key={story.id}
            accessibilityLabel={"Vincular a " + story.title}
            selected={goals ? project === story.id : storyId === story.id}
            disabled={data.busy}
            onPress={() => {
              setProject(story.id);
              setSuggestion(null);
            }}
          >
            {story.title}
          </Chip>
        ))}
      </View>
      {!goals && !stories.data.length ? (
        <Text>Crie uma história antes de adicionar ideias.</Text>
      ) : (
        <>
          {!goals && !storyId && (
            <HelperText type="error">
              O livro selecionado não está mais disponível. Selecione outro
              livro.
            </HelperText>
          )}
          <TextInput
            label={goals ? "Título da meta" : "Ideia"}
            value={text}
            onChangeText={setText}
            multiline={!goals}
            maxLength={goals ? 180 : 100000}
            disabled={data.busy}
          />
          {goals ? (
            <>
              <Text>Unidade</Text>
              <Menu
                visible={unitMenuOpen}
                onDismiss={() => setUnitMenuOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="chevron-down"
                    accessibilityLabel="Selecionar unidade da meta"
                    accessibilityState={{ expanded: unitMenuOpen }}
                    disabled={data.busy}
                    onPress={() => setUnitMenuOpen(true)}
                  >
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </Button>
                }
              >
                {[...new Set<string>([...GOAL_UNITS, unit])].map((option) => (
                  <Menu.Item
                    key={option}
                    title={option.charAt(0).toUpperCase() + option.slice(1)}
                    accessibilityLabel={"Usar unidade " + option}
                    leadingIcon={unit === option ? "check" : undefined}
                    disabled={data.busy}
                    onPress={() => {
                      setUnit(option);
                      setUnitMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>
              <TextInput
                label="Progresso atual"
                keyboardType="number-pad"
                value={current}
                onChangeText={setCurrent}
                maxLength={10}
                disabled={data.busy}
              />
              <TextInput
                label="Objetivo"
                keyboardType="number-pad"
                value={target}
                onChangeText={setTarget}
                maxLength={10}
                disabled={data.busy}
              />
            </>
          ) : (
            <>
              <Text variant="titleMedium">Categoria da ideia</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {categories.map((item) => (
                  <Chip
                    key={item}
                    accessibilityLabel={"Categoria " + item}
                    selected={category === item}
                    disabled={data.busy}
                    onPress={() => setCategory(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </View>
            </>
          )}
          <Button
            mode="contained"
            loading={data.busy}
            disabled={data.busy || !text.trim() || (!goals && !storyId)}
            onPress={() => void run(save)}
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
      {!goals && Boolean(storyId) && (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">Gerador de sugestões</Text>
            <Text>{"Livro: " + selectedStory?.title}</Text>
            <Text>{"Gênero: " + (selectedStory?.genre || "Geral")}</Text>
            {suggestionGenre(selectedStory?.genre) === "Geral" && (
              <Text>
                As sugestões gerais atendem aos gêneros sem uma coleção
                específica.
              </Text>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTION_KINDS.map((item) => (
                <Button
                  key={item.kind}
                  disabled={data.busy}
                  onPress={() => generate(item.kind)}
                >
                  {"Sugerir " + item.label.toLowerCase()}
                </Button>
              ))}
            </View>
            {suggestion && suggestion.projectId === storyId ? (
              <>
                <Text variant="titleSmall">{suggestion.label}</Text>
                <Text>{suggestion.text}</Text>
                <Button
                  disabled={data.busy}
                  mode="outlined"
                  onPress={() =>
                    void run(async () => {
                      if (
                        !stories.data.some(
                          (story) => story.id === suggestion.projectId,
                        )
                      )
                        throw new Error(
                          "O livro da sugestão não está mais disponível.",
                        );
                      const idea: WorkspaceIdea = {
                        id: newId(),
                        projectId: suggestion.projectId,
                        content: suggestion.label + ": " + suggestion.text,
                        category: suggestion.category,
                        createdAt: new Date().toISOString(),
                      };
                      await data.update((items) => [idea, ...items]);
                      setFilterProject(idea.projectId);
                      setFilterCategory("");
                      setSuggestion(null);
                      setNotice("Sugestão salva como ideia.");
                    })
                  }
                >
                  Salvar sugestão como ideia
                </Button>
              </>
            ) : null}
          </Card.Content>
        </Card>
      )}
      {(error || data.saveError) && (
        <HelperText type="error">
          {error || accountErrorMessage(data.saveError)}
        </HelperText>
      )}
      {data.error && (
        <HelperText type="error">{accountErrorMessage(data.error)}</HelperText>
      )}
      {!goals && (
        <>
          <Text variant="titleMedium">Filtrar ideias por livro</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip
              selected={!filterProject}
              onPress={() => setFilterProject("")}
            >
              Todos os livros
            </Chip>
            {stories.data.map((story) => (
              <Chip
                key={story.id}
                accessibilityLabel={"Filtrar por " + story.title}
                selected={filterProject === story.id}
                onPress={() => setFilterProject(story.id)}
              >
                {story.title}
              </Chip>
            ))}
          </View>
          <Text variant="titleMedium">Filtrar por categoria</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip
              selected={!filterCategory}
              onPress={() => setFilterCategory("")}
            >
              Todas as categorias
            </Chip>
            {categories.map((item) => (
              <Chip
                key={item}
                accessibilityLabel={"Filtrar categoria " + item}
                selected={filterCategory === item}
                onPress={() => setFilterCategory(item)}
              >
                {item}
              </Chip>
            ))}
          </View>
        </>
      )}
      <Button
        disabled={data.busy || data.isFetching}
        loading={data.isFetching}
        onPress={() => void data.refetch()}
      >
        Atualizar
      </Button>
      {!visible.length && (
        <Text>
          {goals
            ? "Nenhuma meta ainda."
            : "Nenhuma ideia encontrada para os filtros selecionados."}
        </Text>
      )}
      {visible.map((record) => {
        const goal = record as WorkspaceGoal,
          idea = record as WorkspaceIdea;
        return (
          <Card key={record.id}>
            <Card.Content>
              <Text variant="titleMedium">
                {goals ? goal.title : idea.content}
              </Text>
              <Text>
                {stories.data.find((story) => story.id === record.projectId)
                  ?.title ?? "Sem história vinculada"}
              </Text>
              {goals ? (
                <Text>
                  {goal.current} / {goal.target} {goal.unit}
                  {goal.completed ? " — Concluída" : ""}
                </Text>
              ) : (
                <Chip>{idea.category?.trim() || "Geral"}</Chip>
              )}
            </Card.Content>
            <Card.Actions style={{ flexWrap: "wrap" }}>
              {goals && (
                <Button
                  disabled={data.busy}
                  onPress={() =>
                    void run(async () => {
                      const next = toggleGoal(goal);
                      await data.update((items) =>
                        items.map((item) =>
                          item.id === goal.id ? next : item,
                        ),
                      );
                      if (alerts && justCompleted(goal, next))
                        setNotice("Parabéns! Meta concluída.");
                    })
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
                  setError("");
                  setNotice("");
                  setSuggestion(null);
                  if (goals) {
                    setUnit(goal.unit);
                    setCurrent(String(goal.current));
                    setTarget(String(goal.target));
                  } else setCategory(idea.category?.trim() || "Geral");
                }}
              >
                Editar
              </Button>
              <Button
                disabled={data.busy}
                onPress={() => {
                  setError("");
                  setDeleting(record.id);
                }}
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
          <Dialog.Actions style={{ flexWrap: "wrap", gap: 8 }}>
            <Button disabled={data.busy} onPress={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              loading={data.busy}
              disabled={data.busy}
              onPress={() =>
                void run(async () => {
                  await data.update((items) =>
                    items.filter((item) => item.id !== deleting),
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

import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  CharacterItem,
  CharacterRole,
  TimelineEventItem,
  TimelineImportance,
} from "../types";
import { ENCYCLOPEDIA_CATEGORIES, CHARACTER_ROLES } from "../constants";
import { editableCategories, emptyAttributes } from "../services/universe-api";
import { accountErrorMessage } from "../../../shared/api/account";

export type FormMode =
  | {
      mode: "create";
      targetType: "encyclopedia" | "character" | "timeline";
      defaultCategory?: EncyclopediaCategory;
    }
  | { mode: "edit"; targetType: "encyclopedia"; item: EncyclopediaItem }
  | { mode: "edit"; targetType: "character"; item: CharacterItem }
  | { mode: "edit"; targetType: "timeline"; item: TimelineEventItem }
  | null;

interface CreateEditModalProps {
  formMode: FormMode;
  visible: boolean;
  onDismiss: () => void;
  onSaveEncyclopedia: (
    item: Omit<EncyclopediaItem, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ) => void | Promise<void>;
  onSaveCharacter: (
    item: Omit<CharacterItem, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ) => void | Promise<void>;
  onSaveTimeline: (
    item: Omit<TimelineEventItem, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ) => void | Promise<void>;
}

export function CreateEditModal({
  formMode,
  visible,
  onDismiss,
  onSaveEncyclopedia,
  onSaveCharacter,
  onSaveTimeline,
}: CreateEditModalProps) {
  const theme = useTheme();

  // Encyclopedia Form Fields
  const [encCategory, setEncCategory] = useState<EncyclopediaCategory>("races");
  const [encName, setEncName] = useState("");
  const [encSubtitle, setEncSubtitle] = useState("");
  const [encDescription, setEncDescription] = useState("");
  const [encAttributes, setEncAttributes] = useState<Record<string, string>>(
    {},
  );
  const [encTags, setEncTags] = useState("");

  // Character Form Fields
  const [charNotes, setCharNotes] = useState("");
  const [charName, setCharName] = useState("");
  const [charAlias, setCharAlias] = useState("");
  const [charRole, setCharRole] = useState<CharacterRole>("Protagonista");
  const [charRace, setCharRace] = useState("");
  const [charOrg, setCharOrg] = useState("");
  const [charOccupation, setCharOccupation] = useState("");
  const [charArchetype, setCharArchetype] = useState("");
  const [charAppearance, setCharAppearance] = useState("");
  const [charPersonality, setCharPersonality] = useState("");
  const [charMotivation, setCharMotivation] = useState("");
  const [charConflict, setCharConflict] = useState("");
  const [charBackstory, setCharBackstory] = useState("");
  const [charTraits, setCharTraits] = useState("");
  const [charQuote, setCharQuote] = useState("");

  // Timeline Form Fields
  const [timeTitle, setTimeTitle] = useState("");
  const [timeEra, setTimeEra] = useState("");
  const [timeDateOrder, setTimeDateOrder] = useState("100");
  const [timeDateDisplay, setTimeDateDisplay] = useState("");
  const [timeImportance, setTimeImportance] =
    useState<TimelineImportance>("Maior");
  const [timeSummary, setTimeSummary] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [timeLocation, setTimeLocation] = useState("");
  const [timeCharacters, setTimeCharacters] = useState("");
  const [timeConsequences, setTimeConsequences] = useState("");

  const [validationError, setValidationError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!formMode) return;
    setValidationError("");

    if (formMode.targetType === "encyclopedia") {
      if (formMode.mode === "edit") {
        const it = formMode.item;
        setEncCategory(it.category);
        setEncName(it.name);
        setEncSubtitle(it.subtitle);
        setEncDescription(it.description);
        setEncAttributes({ ...it.attributes });
        setEncTags(it.tags ? it.tags.join(", ") : "");
      } else {
        setEncCategory(formMode.defaultCategory ?? "races");
        setEncName("");
        setEncSubtitle("");
        setEncDescription("");
        setEncAttributes(emptyAttributes(formMode.defaultCategory ?? "races"));
        setEncTags("");
      }
    } else if (formMode.targetType === "character") {
      if (formMode.mode === "edit") {
        const c = formMode.item;
        setCharName(c.name);
        setCharNotes(c.notes ?? "");
        setCharAlias(c.alias ?? "");
        setCharRole(c.role);
        setCharRace(c.race);
        setCharOrg(c.organization ?? "");
        setCharOccupation(c.occupation);
        setCharArchetype(c.archetype);
        setCharAppearance(c.appearance);
        setCharPersonality(c.personality);
        setCharMotivation(c.motivation);
        setCharConflict(c.internalConflict);
        setCharBackstory(c.backstory);
        setCharTraits(c.traits ? c.traits.join(", ") : "");
        setCharQuote(c.quote ?? "");
      } else {
        setCharName("");
        setCharNotes("");
        setCharAlias("");
        setCharRole("Protagonista");
        setCharRace("");
        setCharOrg("");
        setCharOccupation("");
        setCharArchetype("");
        setCharAppearance("");
        setCharPersonality("");
        setCharMotivation("");
        setCharConflict("");
        setCharBackstory("");
        setCharTraits("");
        setCharQuote("");
      }
    } else if (formMode.targetType === "timeline") {
      if (formMode.mode === "edit") {
        const t = formMode.item;
        setTimeTitle(t.title);
        setTimeEra(t.era);
        setTimeDateOrder(String(t.dateOrder));
        setTimeDateDisplay(t.dateDisplay);
        setTimeImportance(t.importance);
        setTimeSummary(t.summary);
        setTimeDescription(t.description);
        setTimeLocation(t.location ?? "");
        setTimeCharacters(
          t.charactersInvolved ? t.charactersInvolved.join(", ") : "",
        );
        setTimeConsequences(t.consequences ?? "");
      } else {
        setTimeTitle("");
        setTimeEra("");
        setTimeDateOrder("100");
        setTimeDateDisplay("");
        setTimeImportance("Maior");
        setTimeSummary("");
        setTimeDescription("");
        setTimeLocation("");
        setTimeCharacters("");
        setTimeConsequences("");
      }
    }
  }, [formMode]);

  if (!formMode) return null;

  const isEdit = formMode.mode === "edit";
  const titleText =
    formMode.targetType === "encyclopedia"
      ? `${isEdit ? "Editar" : "Novo Item na"} Enciclopédia`
      : formMode.targetType === "character"
        ? `${isEdit ? "Editar" : "Novo"} Personagem`
        : `${isEdit ? "Editar" : "Novo Evento da"} Cronologia`;

  async function handleSubmit() {
    if (saving) return;
    setValidationError("");
    setSaving(true);
    try {
      if (formMode?.targetType === "encyclopedia") {
        if (!encName.trim()) {
          setValidationError("Informe o nome do item.");
          return;
        }
        if ([...encName.trim()].length > 100) {
          setValidationError("O nome deve ter no máximo 100 caracteres.");
          return;
        }
        const attributes = { ...encAttributes };
        const tags = encTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        await onSaveEncyclopedia(
          {
            category: encCategory,
            name: encName.trim(),
            subtitle: encSubtitle.trim() || encName.trim(),
            description: encDescription.trim(),
            attributes,
            tags,
          },
          isEdit ? (formMode as { item: EncyclopediaItem }).item.id : undefined,
        );
        onDismiss();
      } else if (formMode?.targetType === "character") {
        if (!charName.trim()) {
          setValidationError("Informe o nome do personagem.");
          return;
        }

        const traits = charTraits
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        await onSaveCharacter(
          {
            name: charName.trim(),
            notes: charNotes,
            alias: charAlias.trim() || undefined,
            role: charRole,
            race: charRace.trim(),
            organization: charOrg.trim() || undefined,
            occupation: charOccupation.trim() || "Aventureiro / Cidadão",
            archetype: charArchetype.trim() || "Personagem",
            appearance: charAppearance.trim(),
            personality: charPersonality.trim(),
            motivation: charMotivation.trim(),
            internalConflict: charConflict.trim() || "",
            backstory: charBackstory.trim(),
            traits,
            quote: charQuote.trim() || undefined,
          },
          isEdit ? (formMode as { item: CharacterItem }).item.id : undefined,
        );
        onDismiss();
      } else if (formMode?.targetType === "timeline") {
        if (!timeTitle.trim()) {
          setValidationError("Informe o título do evento histórico.");
          return;
        }

        if (
          !Number.isInteger(Number(timeDateOrder)) ||
          Math.abs(Number(timeDateOrder)) > 2147483647
        ) {
          setValidationError("Informe uma ordem numérica inteira válida.");
          return;
        }
        const charsInvolved = timeCharacters
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);

        await onSaveTimeline(
          {
            title: timeTitle.trim(),
            era: timeEra.trim(),
            dateOrder: Number(timeDateOrder),
            dateDisplay: timeDateDisplay.trim(),
            importance: timeImportance,
            summary: timeDescription.trim(),
            description: timeDescription.trim(),
            location: timeLocation.trim() || undefined,
            charactersInvolved: charsInvolved,
            consequences: timeConsequences.trim() || undefined,
          },
          isEdit
            ? (formMode as { item: TimelineEventItem }).item.id
            : undefined,
        );
        onDismiss();
      }
    } catch (cause) {
      setValidationError(accountErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <Dialog
        visible={visible}
        dismissable={!saving}
        onDismiss={saving ? undefined : onDismiss}
        style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
      >
        <Dialog.Title style={styles.dialogTitle}>{titleText}</Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {formMode.targetType === "encyclopedia" && (
              <View style={styles.formSection}>
                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Categoria da Enciclopédia:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {ENCYCLOPEDIA_CATEGORIES.filter((cat) =>
                    editableCategories.some((key) => key === cat.key),
                  ).map((cat) => (
                    <Chip
                      key={cat.key}
                      icon={cat.icon}
                      selected={encCategory === cat.key}
                      disabled={isEdit || saving}
                      onPress={() => {
                        setEncCategory(cat.key);
                        setEncAttributes(emptyAttributes(cat.key));
                      }}
                      style={styles.categoryChip}
                    >
                      {cat.label}
                    </Chip>
                  ))}
                </ScrollView>

                <TextInput
                  mode="outlined"
                  label="Nome da Entrada *"
                  accessibilityLabel="Nome da Entrada"
                  disabled={saving}
                  value={encName}
                  onChangeText={setEncName}
                  placeholder="Ex: Sylfos Celestiais, Astrolábio..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Descrição & Lore Completo"
                  accessibilityLabel="Descrição da entrada"
                  disabled={saving}
                  multiline
                  numberOfLines={4}
                  value={encDescription}
                  onChangeText={setEncDescription}
                  placeholder="Escreva a história, funcionamento e detalhes..."
                  style={styles.input}
                />

                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Atributos e características:
                </Text>
                {Object.entries(encAttributes).map(([label, value]) => (
                  <TextInput
                    key={label}
                    mode="outlined"
                    label={label}
                    accessibilityLabel={label}
                    value={value}
                    multiline
                    disabled={saving}
                    onChangeText={(next) =>
                      setEncAttributes((current) => ({
                        ...current,
                        [label]: next,
                      }))
                    }
                    style={styles.input}
                  />
                ))}
              </View>
            )}

            {formMode.targetType === "character" && (
              <View style={styles.formSection}>
                <TextInput
                  mode="outlined"
                  label="Nome do Personagem *"
                  value={charName}
                  onChangeText={setCharName}
                  placeholder="Ex: Aria Vane"
                  style={styles.input}
                />

                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Papel na Narrativa:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {CHARACTER_ROLES.map((r) => (
                    <Chip
                      key={r.role}
                      icon={r.icon}
                      selected={charRole === r.role}
                      onPress={() => setCharRole(r.role)}
                      style={styles.categoryChip}
                    >
                      {r.role}
                    </Chip>
                  ))}
                </ScrollView>

                <View style={styles.attrRow}>
                  <TextInput
                    mode="outlined"
                    label="Raça / Povo"
                    value={charRace}
                    onChangeText={setCharRace}
                    placeholder="Ex: Sylfo Celestial"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="Organização / Guilda"
                    value={charOrg}
                    onChangeText={setCharOrg}
                    placeholder="Ex: Ordem dos Tecelões"
                    style={styles.attrInput}
                  />
                </View>

                <View style={styles.attrRow}></View>

                <TextInput
                  mode="outlined"
                  label="Motivação Principal"
                  multiline
                  numberOfLines={2}
                  value={charMotivation}
                  onChangeText={setCharMotivation}
                  placeholder="O que move este personagem?"
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="História de Origem (Backstory)"
                  multiline
                  numberOfLines={3}
                  value={charBackstory}
                  onChangeText={setCharBackstory}
                  placeholder="Como chegou até aqui?"
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Aparência Física"
                  value={charAppearance}
                  onChangeText={setCharAppearance}
                  placeholder="Cabelos, olhos, vestimentas marcantes..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Personalidade"
                  value={charPersonality}
                  onChangeText={setCharPersonality}
                  placeholder="Comportamento, manias, virtudes e vícios..."
                  style={styles.input}
                />
                <TextInput
                  label="Notas"
                  value={charNotes}
                  onChangeText={setCharNotes}
                  multiline
                  mode="outlined"
                />

                <TextInput
                  mode="outlined"
                  label="Frase Marcante / Citação"
                  value={charQuote}
                  onChangeText={setCharQuote}
                  placeholder="Ex: Escrever é o único feitiço que não cobra memória..."
                  style={styles.input}
                />
              </View>
            )}

            {formMode.targetType === "timeline" && (
              <View style={styles.formSection}>
                <TextInput
                  mode="outlined"
                  label="Título do Evento *"
                  value={timeTitle}
                  onChangeText={setTimeTitle}
                  placeholder="Ex: A Noite da Cinza Silenciosa"
                  style={styles.input}
                />

                <View style={styles.attrRow}>
                  <TextInput
                    mode="outlined"
                    label="Era Histórica"
                    value={timeEra}
                    onChangeText={setTimeEra}
                    placeholder="Ex: Segunda Idade"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="Data / Ano Visível"
                    value={timeDateDisplay}
                    onChangeText={setTimeDateDisplay}
                    placeholder="Ex: Ano 312 da 2ª Idade"
                    style={styles.attrInput}
                  />
                </View>

                <View style={styles.attrRow}>
                  <TextInput
                    mode="outlined"
                    label="Ordem (número para ordenar)"
                    keyboardType="numeric"
                    value={timeDateOrder}
                    onChangeText={setTimeDateOrder}
                    placeholder="Ex: 380"
                    style={styles.attrInput}
                  />
                </View>

                <TextInput
                  mode="outlined"
                  label="Descrição Histórica Detalhada"
                  multiline
                  numberOfLines={4}
                  value={timeDescription}
                  onChangeText={setTimeDescription}
                  placeholder="Como o fato ocorreu, quem liderou e o que houve..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Local onde aconteceu"
                  value={timeLocation}
                  onChangeText={setTimeLocation}
                  placeholder="Ex: Cidadela Suspensa"
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Personagens Envolvidos (vírgula)"
                  value={timeCharacters}
                  onChangeText={setTimeCharacters}
                  placeholder="Ex: Aria Vane, Lord Thorne"
                  style={styles.input}
                />
              </View>
            )}

            {validationError ? (
              <HelperText type="error" visible={Boolean(validationError)}>
                {validationError}
              </HelperText>
            ) : null}
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.actions}>
          <Button disabled={saving} onPress={onDismiss}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            disabled={saving}
            loading={saving}
            onPress={() => void handleSubmit()}
            style={{ marginLeft: 8 }}
          >
            Salvar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: "90%",
    borderRadius: 16,
    marginHorizontal: 14,
  },
  dialogTitle: {
    fontWeight: "bold",
    fontSize: 18,
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scrollContent: {
    paddingVertical: 6,
  },
  formSection: {
    gap: 12,
  },
  fieldLabel: {
    fontWeight: "600",
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    marginRight: 4,
  },
  input: {
    width: "100%",
  },
  attrRow: {
    flexDirection: "row",
    gap: 10,
  },
  attrInput: {
    flex: 1,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

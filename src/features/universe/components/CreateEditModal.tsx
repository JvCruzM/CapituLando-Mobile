import { StableFormInput as TextInput } from "./StableFormInput";
import { UniverseImage } from "./UniverseImage";
import { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Chip,
  Dialog,
  HelperText,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { SegmentedButtons } from "../../../shared/components/Controls";
import { Button } from "../../../shared/components/Controls";
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  CharacterItem,
  CharacterImageFit,
  CharacterImagePosition,
  CharacterRole,
  TimelineEventItem,
  TimelineImportance,
} from "../types";
import { ENCYCLOPEDIA_CATEGORIES, CHARACTER_ROLES } from "../constants";
import {
  editableCategories,
  emptyAttributes,
  type UniverseChapterOption,
} from "../services/universe-api";
import { accountErrorMessage } from "../../../shared/api/account";
import { chooseProfilePhoto } from "../../profile/services/profile-photo";

export interface SelectableRecordOption {
  id: string;
  name: string;
}

export type FormMode =
  | {
      mode: "create";
      targetType: "encyclopedia" | "character" | "timeline";
      defaultCategory?: EncyclopediaCategory;
      freeChronology?: boolean;
    }
  | { mode: "edit"; targetType: "encyclopedia"; item: EncyclopediaItem }
  | { mode: "edit"; targetType: "character"; item: CharacterItem }
  | { mode: "edit"; targetType: "timeline"; item: TimelineEventItem }
  | null;

interface CreateEditModalProps {
  formMode: FormMode;
  nextTimelineOrder?: number;
  visible: boolean;
  races?: SelectableRecordOption[];
  organizations?: SelectableRecordOption[];
  locations?: SelectableRecordOption[];
  chapters?: UniverseChapterOption[];
  characters?: SelectableRecordOption[];
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
  nextTimelineOrder = 1,
  visible,
  races = [],
  organizations = [],
  locations = [],
  chapters = [],
  characters = [],
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
  const [encImage, setEncImage] = useState<string | null>(null);
  const [encRaceId, setEncRaceId] = useState<string | null>(null);
  const [encParentLocationId, setEncParentLocationId] = useState<string | null>(
    null,
  );
  const [encHeadquartersLocationId, setEncHeadquartersLocationId] = useState<
    string | null
  >(null);
  const [encConceptCategory, setEncConceptCategory] =
    useState<string>("Lore/História");

  // Character Form Fields
  const [charName, setCharName] = useState("");
  const [charAlias, setCharAlias] = useState("");
  const [charRole, setCharRole] = useState<CharacterRole>("Protagonista");
  const [charRaceId, setCharRaceId] = useState<string | null>(null);
  const [charOrgIds, setCharOrgIds] = useState<string[]>([]);
  const [charAge, setCharAge] = useState("");
  const [charHeight, setCharHeight] = useState("");
  const [charWeight, setCharWeight] = useState("");
  const [charZodiac, setCharZodiac] = useState("");
  const [charBloodType, setCharBloodType] = useState("");
  const [charMbti, setCharMbti] = useState("");
  const [charLikes, setCharLikes] = useState("");
  const [charDislikes, setCharDislikes] = useState("");
  const [charDrinks, setCharDrinks] = useState("");
  const [charImage, setCharImage] = useState<string | null>(null);
  const [charImageFit, setCharImageFit] = useState<CharacterImageFit>("cover");
  const [charImagePosition, setCharImagePosition] =
    useState<CharacterImagePosition>("center");
  const [charOccupation, setCharOccupation] = useState("");
  const [charArchetype, setCharArchetype] = useState("");
  const [charAppearance, setCharAppearance] = useState("");
  const [charPersonality, setCharPersonality] = useState("");
  const [charMotivation, setCharMotivation] = useState("");
  const [charConflict, setCharConflict] = useState("");
  const [charNotes, setCharNotes] = useState("");
  const [charBackstory, setCharBackstory] = useState("");
  const [charTraits, setCharTraits] = useState("");
  const [charQuote, setCharQuote] = useState("");

  const isFreeChronology =
    formMode?.targetType === "timeline" &&
    (formMode.mode === "create"
      ? formMode.freeChronology
      : formMode.item.id.startsWith("chronology:"));
  const [freeCharacters, setFreeCharacters] = useState("");
  const [freeLocation, setFreeLocation] = useState("");
  // Timeline Form Fields
  const [timeTitle, setTimeTitle] = useState("");
  const [timeEra, setTimeEra] = useState("");
  const [timeDateOrder, setTimeDateOrder] = useState("1");
  const [timeDateDisplay, setTimeDateDisplay] = useState("");
  const [timeImportance, setTimeImportance] =
    useState<TimelineImportance>("Maior");
  const [timeSummary, setTimeSummary] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [timeChapterId, setTimeChapterId] = useState<string | null>(null);
  const [timeLocationId, setTimeLocationId] = useState<string | null>(null);
  const [timeCharacterIds, setTimeCharacterIds] = useState<string[]>([]);
  const [timeEventImage, setTimeEventImage] = useState<string | null>(null);
  const [timeConsequences, setTimeConsequences] = useState("");

  const [pickingImage, setPickingImage] = useState(false);
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
        setEncImage(it.image ?? null);
        setEncRaceId(it.raceId ?? null);
        setEncParentLocationId(it.parentLocationId ?? null);
        setEncHeadquartersLocationId(it.headquartersLocationId ?? null);
        setEncConceptCategory(
          it.conceptCategory?.replace("Lore / História", "Lore/História") ?? "",
        );
      } else {
        setEncCategory(formMode.defaultCategory ?? "races");
        setEncName("");
        setEncSubtitle("");
        setEncDescription("");
        setEncAttributes(emptyAttributes(formMode.defaultCategory ?? "races"));
        setEncTags("");
        setEncImage(null);
        setEncRaceId(null);
        setEncParentLocationId(null);
        setEncHeadquartersLocationId(null);
        setEncConceptCategory(
          formMode.defaultCategory === "theme" ? "Lore/História" : "",
        );
      }
    } else if (formMode.targetType === "character") {
      if (formMode.mode === "edit") {
        const c = formMode.item;
        setCharName(c.name);
        setCharAlias(c.alias ?? "");
        setCharRole(c.role);
        setCharRaceId(c.raceId ?? null);
        setCharOrgIds(c.organizationIds ?? []);
        setCharAge(c.age !== null && c.age !== undefined ? String(c.age) : "");
        setCharHeight(c.height ?? "");
        setCharWeight(c.weight ?? "");
        setCharZodiac(c.zodiac ?? "");
        setCharBloodType(c.bloodType ?? "");
        setCharMbti(c.mbti ?? "");
        setCharLikes(c.likes ?? "");
        setCharDislikes(c.dislikes ?? "");
        setCharDrinks(c.drinks ?? "");
        setCharImage(c.characterImage ?? null);
        setCharImageFit(c.imageFit ?? "cover");
        setCharImagePosition(c.imagePosition ?? "center");
        setCharOccupation(c.occupation);
        setCharArchetype(c.archetype);
        setCharAppearance(c.appearance);
        setCharPersonality(c.personality);
        setCharMotivation(c.motivation);
        setCharConflict(c.internalConflict);
        setCharBackstory(c.backstory);
        setCharNotes(c.notes ?? "");
        setCharTraits(c.traits ? c.traits.join(", ") : "");
        setCharQuote(c.quote ?? "");
      } else {
        setCharName("");
        setCharAlias("");
        setCharRole("Protagonista");
        setCharRaceId(null);
        setCharOrgIds([]);
        setCharAge("");
        setCharHeight("");
        setCharWeight("");
        setCharZodiac("");
        setCharBloodType("");
        setCharMbti("");
        setCharLikes("");
        setCharDislikes("");
        setCharDrinks("");
        setCharImage(null);
        setCharImageFit("cover");
        setCharImagePosition("center");
        setCharOccupation("");
        setCharArchetype("");
        setCharAppearance("");
        setCharPersonality("");
        setCharMotivation("");
        setCharConflict("");
        setCharBackstory("");
        setCharNotes("");
        setCharTraits("");
        setCharQuote("");
      }
    } else if (formMode.targetType === "timeline") {
      if (formMode.mode === "edit") {
        const t = formMode.item;
        setTimeTitle(t.title);
        setFreeCharacters(t.charactersInvolved.join(", "));
        setFreeLocation(t.location ?? "");
        setTimeEra(t.era);
        setTimeDateOrder(String(t.dateOrder));
        setTimeDateDisplay(t.dateDisplay);
        setTimeImportance(t.importance);
        setTimeSummary(t.summary);
        setTimeDescription(t.description);
        setTimeChapterId(t.chapterId ?? null);
        setTimeLocationId(t.locationId ?? null);
        setTimeCharacterIds(t.characterIds ?? []);
        setTimeEventImage(t.eventImage ?? null);
        setTimeConsequences(t.consequences ?? "");
      } else {
        setTimeTitle("");
        setFreeCharacters("");
        setFreeLocation("");
        setTimeEra("Era Atual");
        setTimeDateOrder(String(nextTimelineOrder));
        setTimeDateDisplay("Ano 1 da Nova Era");
        setTimeImportance("Maior");
        setTimeSummary("");
        setTimeDescription("");
        setTimeChapterId(null);
        setTimeLocationId(null);
        setTimeCharacterIds([]);
        setTimeEventImage(null);
        setTimeConsequences("");
      }
    }
  }, [formMode]);

  if (!formMode) return null;

  const isEdit = formMode.mode === "edit";
  const busy = saving || pickingImage;
  const titleText =
    formMode.targetType === "encyclopedia"
      ? `${isEdit ? "Editar" : "Novo Item na"} Enciclopédia`
      : formMode.targetType === "character"
        ? `${isEdit ? "Editar" : "Novo"} Personagem`
        : isFreeChronology
          ? `${isEdit ? "Editar" : "Novo"} marco de cronologia livre`
          : `${isEdit ? "Editar" : "Novo"} evento`;

  async function handlePickImage(
    target: "character" | "event" | "encyclopedia",
  ) {
    if (busy) return;
    setValidationError("");
    setPickingImage(true);
    try {
      const photo = await chooseProfilePhoto();
      if (photo) {
        if (target === "character") setCharImage(photo);
        else if (target === "event") setTimeEventImage(photo);
        else setEncImage(photo);
      }
    } catch (cause) {
      setValidationError(accountErrorMessage(cause));
    } finally {
      setPickingImage(false);
    }
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id)
      ? list.filter((item) => item !== id)
      : [...list, id];
  }

  async function handleSubmit() {
    if (busy) return;
    setValidationError("");
    setSaving(true);
    try {
      if (formMode?.targetType === "encyclopedia") {
        if (!encName.trim()) {
          setValidationError("Informe o nome do item.");
          return;
        }
        const maxName =
          encCategory === "theme" ||
          encConceptCategory ||
          encCategory === "locations" ||
          encCategory === "organizations"
            ? 150
            : encCategory === "world-rules"
              ? 150
              : 100;
        if (encName.trim().length > maxName) {
          setValidationError(
            `O nome deve ter no máximo ${maxName} caracteres.`,
          );
          return;
        }
        if (
          (encCategory === "theme" || encConceptCategory) &&
          !encDescription.trim()
        ) {
          setValidationError("Informe a descrição do conceito.");
          return;
        }
        const selectedRace = races.find((r) => r.id === encRaceId);
        const selectedParent = locations.find(
          (l) => l.id === encParentLocationId,
        );
        const selectedHq = locations.find(
          (l) => l.id === encHeadquartersLocationId,
        );

        const attributes = { ...encAttributes };
        if (encCategory === "theme" || encConceptCategory) {
          attributes["Tipo de Conceito"] = encConceptCategory;
        }

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
            image: encImage,
            raceId: encCategory === "creatures" ? encRaceId : null,
            raceName:
              encCategory === "creatures" ? (selectedRace?.name ?? null) : null,
            parentLocationId:
              encCategory === "locations" ? encParentLocationId : null,
            parentLocationName:
              encCategory === "locations"
                ? (selectedParent?.name ?? null)
                : null,
            headquartersLocationId:
              encCategory === "organizations"
                ? encHeadquartersLocationId
                : null,
            headquartersLocationName:
              encCategory === "organizations"
                ? (selectedHq?.name ?? null)
                : null,
            conceptCategory:
              encCategory === "theme" ||
              (formMode.mode === "edit" &&
                formMode.targetType === "encyclopedia" &&
                formMode.item.id.startsWith("concept:"))
                ? encConceptCategory
                : undefined,
          },
          isEdit ? (formMode as { item: EncyclopediaItem }).item.id : undefined,
        );
        onDismiss();
      } else if (formMode?.targetType === "character") {
        if (!charName.trim()) {
          setValidationError("Informe o nome do personagem.");
          return;
        }
        if ([...charName.trim()].length > 100) {
          setValidationError("O nome deve ter no máximo 100 caracteres.");
          return;
        }

        const parsedAge = charAge.trim() ? parseInt(charAge.trim(), 10) : null;
        if (
          parsedAge !== null &&
          (!Number.isFinite(parsedAge) || parsedAge < 0)
        ) {
          setValidationError("Informe uma idade válida (número inteiro >= 0).");
          return;
        }

        const selectedRace = races.find((r) => r.id === charRaceId);
        const selectedOrgNames = organizations
          .filter((o) => charOrgIds.includes(o.id))
          .map((o) => o.name)
          .join(", ");

        const traits = charTraits
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        await onSaveCharacter(
          {
            name: charName.trim(),
            alias: charAlias.trim() || undefined,
            role: charRole,
            raceId: charRaceId,
            race: selectedRace?.name ?? "Sem raça vinculada",
            organizationIds: charOrgIds,
            organization: selectedOrgNames || undefined,
            age: parsedAge,
            height: charHeight.trim() || undefined,
            weight: charWeight.trim() || undefined,
            zodiac: charZodiac.trim() || undefined,
            bloodType: charBloodType.trim() || undefined,
            mbti: charMbti.trim().toUpperCase() || undefined,
            likes: charLikes.trim() || undefined,
            dislikes: charDislikes.trim() || undefined,
            drinks: charDrinks.trim() || undefined,
            characterImage: charImage,
            imageFit: charImageFit,
            imagePosition: charImagePosition,
            occupation: charOccupation.trim(),
            archetype: charArchetype.trim(),
            appearance: charAppearance.trim(),
            personality: charPersonality.trim(),
            motivation: charMotivation.trim(),
            internalConflict: charConflict.trim(),
            backstory: charBackstory.trim(),
            notes: charNotes.trim(),
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
        if ([...timeTitle.trim()].length > 200) {
          setValidationError("O título deve ter no máximo 200 caracteres.");
          return;
        }

        const selectedLocation = locations.find(
          (loc) => loc.id === timeLocationId,
        );
        const selectedChapter = chapters.find((ch) => ch.id === timeChapterId);
        const involvedNames = characters
          .filter((c) => timeCharacterIds.includes(c.id))
          .map((c) => c.name);

        await onSaveTimeline(
          {
            title: timeTitle.trim(),
            era: timeEra.trim() || "Era Atual",
            dateOrder: Number.isFinite(Number(timeDateOrder))
              ? Number(timeDateOrder)
              : 1,
            dateDisplay: timeDateDisplay.trim(),
            importance: timeImportance,
            summary: timeSummary.trim(),
            description: timeDescription.trim() || timeSummary.trim(),
            chapterId: timeChapterId,
            chapterTitle: selectedChapter?.title,
            locationId: timeLocationId,
            location: isFreeChronology ? freeLocation : selectedLocation?.name,
            characterIds: timeCharacterIds,
            charactersInvolved: isFreeChronology
              ? freeCharacters
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
              : involvedNames,
            eventImage: timeEventImage,
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
        dismissable={!busy}
        onDismiss={busy ? undefined : onDismiss}
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
                {(encCategory !== "world-rules" ||
                  Boolean(encConceptCategory)) && (
                  <>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Imagem da Entrada:
                    </Text>
                    {encImage ? (
                      <View style={styles.imagePreviewBox}>
                        <UniverseImage
                          uri={encImage}
                          style={styles.imagePreview}
                        />
                        <View style={styles.attrRow}>
                          <Button
                            mode="outlined"
                            icon="image-edit"
                            disabled={busy}
                            onPress={() => void handlePickImage("encyclopedia")}
                            style={styles.attrInput}
                          >
                            Trocar imagem
                          </Button>
                          <Button
                            mode="text"
                            textColor={theme.colors.error}
                            disabled={busy}
                            onPress={() => setEncImage(null)}
                          >
                            Remover
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <Button
                        mode="outlined"
                        icon="image-plus"
                        loading={pickingImage}
                        disabled={busy}
                        onPress={() => void handlePickImage("encyclopedia")}
                      >
                        Selecionar imagem da entrada
                      </Button>
                    )}
                  </>
                )}
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
                      disabled={isEdit || busy}
                      onPress={() => {
                        setEncCategory(cat.key);
                        setEncConceptCategory(
                          cat.key === "theme" ? "Lore/História" : "",
                        );
                        setEncAttributes(emptyAttributes(cat.key));
                      }}
                      style={styles.categoryChip}
                    >
                      {cat.label}
                    </Chip>
                  ))}
                </ScrollView>
                {(encCategory === "theme" || Boolean(encConceptCategory)) && (
                  <View>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Tipo de Conceito / Universo:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      {[
                        "Lore/História",
                        "Regra de Magia",
                        "Local",
                        "Organização",
                      ].map((catName) => (
                        <Chip
                          key={catName}
                          selected={encConceptCategory === catName}
                          disabled={busy}
                          onPress={() => {
                            setEncConceptCategory(catName);
                            setEncAttributes((curr) => ({
                              ...curr,
                              "Tipo de Conceito": catName,
                            }));
                          }}
                          style={styles.categoryChip}
                        >
                          {catName}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {encCategory === "creatures" && !encConceptCategory && (
                  <View>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Raça da Criatura:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      <Chip
                        selected={!encRaceId}
                        disabled={busy}
                        onPress={() => setEncRaceId(null)}
                        style={styles.categoryChip}
                      >
                        Sem raça vinculada
                      </Chip>
                      {races.map((r) => (
                        <Chip
                          key={r.id}
                          icon="dna"
                          selected={encRaceId === r.id}
                          disabled={busy}
                          onPress={() => setEncRaceId(r.id)}
                          style={styles.categoryChip}
                        >
                          {r.name}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {encCategory === "locations" && !encConceptCategory && (
                  <View>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Local Pai (Hierarquia Geográfica):
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      <Chip
                        selected={!encParentLocationId}
                        disabled={busy}
                        onPress={() => setEncParentLocationId(null)}
                        style={styles.categoryChip}
                      >
                        Nenhum (Local Raiz / Principal)
                      </Chip>
                      {locations
                        .filter(
                          (loc) =>
                            !isEdit ||
                            loc.id !==
                              (formMode as { item: EncyclopediaItem }).item?.id,
                        )
                        .map((loc) => (
                          <Chip
                            key={loc.id}
                            icon="map-marker-radius"
                            selected={encParentLocationId === loc.id}
                            disabled={busy}
                            onPress={() => setEncParentLocationId(loc.id)}
                            style={styles.categoryChip}
                          >
                            {loc.name}
                          </Chip>
                        ))}
                    </ScrollView>
                  </View>
                )}
                {encCategory === "organizations" && !encConceptCategory && (
                  <View>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Sede / Quartel-General:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      <Chip
                        selected={!encHeadquartersLocationId}
                        disabled={busy}
                        onPress={() => setEncHeadquartersLocationId(null)}
                        style={styles.categoryChip}
                      >
                        Sem sede definida
                      </Chip>
                      {locations.map((loc) => (
                        <Chip
                          key={loc.id}
                          icon="office-building"
                          selected={encHeadquartersLocationId === loc.id}
                          disabled={busy}
                          onPress={() => setEncHeadquartersLocationId(loc.id)}
                          style={styles.categoryChip}
                        >
                          {loc.name}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TextInput
                  mode="outlined"
                  label="Nome da Entrada *"
                  accessibilityLabel="Nome da Entrada"
                  disabled={busy}
                  value={encName}
                  onChangeText={setEncName}
                  placeholder="Ex: Sylfos Celestiais, Astrolábio..."
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Descrição & Lore Completo"
                  accessibilityLabel="Descrição da entrada"
                  disabled={busy}
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
                {Object.entries(encAttributes)
                  .filter(([label]) => label !== "Tipo de Conceito")
                  .map(([label, value]) => (
                    <TextInput
                      key={label}
                      mode="outlined"
                      label={label}
                      accessibilityLabel={label}
                      value={value}
                      multiline
                      disabled={busy}
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
                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Imagem do Personagem:
                </Text>
                {charImage ? (
                  <View style={styles.imagePreviewBox}>
                    <UniverseImage
                      uri={charImage}
                      fit={charImageFit}
                      position={charImagePosition}
                      style={styles.imagePreview}
                    />
                    <View style={styles.attrRow}>
                      <Button
                        mode="outlined"
                        icon="image-edit"
                        disabled={busy}
                        onPress={() => void handlePickImage("character")}
                        style={styles.attrInput}
                      >
                        Trocar foto
                      </Button>
                      <Button
                        mode="text"
                        textColor={theme.colors.error}
                        disabled={busy}
                        onPress={() => setCharImage(null)}
                      >
                        Remover
                      </Button>
                    </View>
                    <Text variant="labelSmall">Ajuste de enquadramento:</Text>
                    <SegmentedButtons
                      value={charImageFit}
                      onValueChange={(v) =>
                        setCharImageFit(v as CharacterImageFit)
                      }
                      buttons={[
                        { value: "cover", label: "Preencher" },
                        { value: "contain", label: "Imagem inteira" },
                      ]}
                      density="small"
                    />
                    <Text variant="labelSmall">Posição do foco:</Text>
                    <SegmentedButtons
                      value={charImagePosition}
                      onValueChange={(v) =>
                        setCharImagePosition(v as CharacterImagePosition)
                      }
                      buttons={[
                        { value: "top", label: "Topo" },
                        { value: "center", label: "Centro" },
                        { value: "bottom", label: "Base" },
                      ]}
                      density="small"
                    />
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    icon="image-plus"
                    loading={pickingImage}
                    disabled={busy}
                    onPress={() => void handlePickImage("character")}
                  >
                    Selecionar imagem do personagem
                  </Button>
                )}

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

                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Raça / Povo (selecione um registro):
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  <Chip
                    selected={charRaceId === null}
                    onPress={() => setCharRaceId(null)}
                    style={styles.categoryChip}
                  >
                    Sem raça
                  </Chip>
                  {races.map((r) => (
                    <Chip
                      key={r.id}
                      icon="dna"
                      selected={charRaceId === r.id}
                      onPress={() => setCharRaceId(r.id)}
                      style={styles.categoryChip}
                    >
                      {r.name}
                    </Chip>
                  ))}
                </ScrollView>

                {organizations.length > 0 ? (
                  <>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Organizações / Guildas (selecione):
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      {organizations.map((org) => (
                        <Chip
                          key={org.id}
                          icon="bank"
                          selected={charOrgIds.includes(org.id)}
                          onPress={() =>
                            setCharOrgIds((current) =>
                              toggleId(current, org.id),
                            )
                          }
                          style={styles.categoryChip}
                        >
                          {org.name}
                        </Chip>
                      ))}
                    </ScrollView>
                  </>
                ) : null}

                <View style={styles.attrRow}>
                  <TextInput
                    mode="outlined"
                    label="Idade"
                    keyboardType="numeric"
                    value={charAge}
                    onChangeText={setCharAge}
                    placeholder="Ex: 24"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="Altura"
                    value={charHeight}
                    onChangeText={setCharHeight}
                    placeholder="Ex: 1,72m"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="Peso"
                    value={charWeight}
                    onChangeText={setCharWeight}
                    placeholder="Ex: 64kg"
                    style={styles.attrInput}
                  />
                </View>

                <View style={styles.attrRow}>
                  <TextInput
                    mode="outlined"
                    label="Signo"
                    value={charZodiac}
                    onChangeText={setCharZodiac}
                    placeholder="Ex: Escorpião"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="Tipo Sanguíneo"
                    value={charBloodType}
                    onChangeText={setCharBloodType}
                    placeholder="Ex: O-"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="MBTI"
                    value={charMbti}
                    onChangeText={setCharMbti}
                    placeholder="Ex: INTJ"
                    maxLength={8}
                    style={styles.attrInput}
                  />
                </View>

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
                  label="Notas"
                  multiline
                  value={charNotes}
                  onChangeText={setCharNotes}
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
                  multiline
                  numberOfLines={2}
                  value={charAppearance}
                  onChangeText={setCharAppearance}
                  placeholder="Cabelos, olhos, vestimentas marcantes..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Personalidade"
                  multiline
                  numberOfLines={2}
                  value={charPersonality}
                  onChangeText={setCharPersonality}
                  placeholder="Comportamento, manias, virtudes e vícios..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Gostos"
                  value={charLikes}
                  onChangeText={setCharLikes}
                  placeholder="O que o personagem aprecia..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Desgostos"
                  value={charDislikes}
                  onChangeText={setCharDislikes}
                  placeholder="O que o personagem detesta..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Bebidas Favoritas"
                  value={charDrinks}
                  onChangeText={setCharDrinks}
                  placeholder="Ex: Chá de ervas amargas, hidromel..."
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Frase Marcante / Lema"
                  value={charQuote}
                  onChangeText={setCharQuote}
                  placeholder="Ex: Escrever é o único feitiço que não cobra memória..."
                  style={styles.input}
                />
              </View>
            )}

            {formMode.targetType === "timeline" && (
              <View style={styles.formSection}>
                {!isFreeChronology && (
                  <>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Imagem do Evento:
                    </Text>
                    {timeEventImage ? (
                      <View style={styles.imagePreviewBox}>
                        <UniverseImage
                          uri={timeEventImage}
                          style={styles.imagePreview}
                        />
                        <View style={styles.attrRow}>
                          <Button
                            mode="outlined"
                            icon="image-edit"
                            disabled={busy}
                            onPress={() => void handlePickImage("event")}
                            style={styles.attrInput}
                          >
                            Trocar imagem
                          </Button>
                          <Button
                            mode="text"
                            textColor={theme.colors.error}
                            disabled={busy}
                            onPress={() => setTimeEventImage(null)}
                          >
                            Remover
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <Button
                        mode="outlined"
                        icon="image-plus"
                        loading={pickingImage}
                        disabled={busy}
                        onPress={() => void handlePickImage("event")}
                      >
                        Selecionar imagem do evento
                      </Button>
                    )}
                  </>
                )}
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
                    label="Data / Período Cronológico"
                    value={timeDateDisplay}
                    onChangeText={setTimeDateDisplay}
                    placeholder="Ex: Ano 312 da 2ª Idade"
                    style={styles.attrInput}
                  />
                  <TextInput
                    mode="outlined"
                    label="Posição na sequência"
                    keyboardType="numeric"
                    value={timeDateOrder}
                    onChangeText={setTimeDateOrder}
                    placeholder="Ex: 1"
                    style={{ width: 130 }}
                  />
                </View>
                <Text variant="bodySmall">
                  A posição define a sequência dos eventos: números menores
                  aparecem primeiro. A data pode ser um texto livre.
                </Text>
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
                {isFreeChronology ? (
                  <>
                    <TextInput
                      mode="outlined"
                      label="Local"
                      value={freeLocation}
                      onChangeText={setFreeLocation}
                    />
                    <TextInput
                      mode="outlined"
                      label="Personagens (separados por vírgula)"
                      value={freeCharacters}
                      onChangeText={setFreeCharacters}
                    />
                  </>
                ) : (
                  <>
                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Capítulo Relacionado (selecione):
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      <Chip
                        selected={timeChapterId === null}
                        onPress={() => setTimeChapterId(null)}
                        style={styles.categoryChip}
                      >
                        Nenhum (Cronologia livre)
                      </Chip>
                      {chapters.map((ch) => (
                        <Chip
                          key={ch.id}
                          icon="book-open-variant"
                          selected={timeChapterId === ch.id}
                          onPress={() => setTimeChapterId(ch.id)}
                          style={styles.categoryChip}
                        >
                          {ch.title}
                        </Chip>
                      ))}
                    </ScrollView>

                    <Text variant="labelLarge" style={styles.fieldLabel}>
                      Local do Evento (selecione):
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      <Chip
                        selected={timeLocationId === null}
                        onPress={() => setTimeLocationId(null)}
                        style={styles.categoryChip}
                      >
                        Sem local
                      </Chip>
                      {locations.map((loc) => (
                        <Chip
                          key={loc.id}
                          icon="map-marker"
                          selected={timeLocationId === loc.id}
                          onPress={() => setTimeLocationId(loc.id)}
                          style={styles.categoryChip}
                        >
                          {loc.name}
                        </Chip>
                      ))}
                    </ScrollView>

                    {characters.length > 0 ? (
                      <>
                        <Text variant="labelLarge" style={styles.fieldLabel}>
                          Personagens Participantes (selecione):
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.categoryScroll}
                        >
                          {characters.map((char) => (
                            <Chip
                              key={char.id}
                              icon="account"
                              selected={timeCharacterIds.includes(char.id)}
                              onPress={() =>
                                setTimeCharacterIds((current) =>
                                  toggleId(current, char.id),
                                )
                              }
                              style={styles.categoryChip}
                            >
                              {char.name}
                            </Chip>
                          ))}
                        </ScrollView>
                      </>
                    ) : null}
                  </>
                )}
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
          <Button disabled={busy} onPress={onDismiss}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            disabled={busy}
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
  imagePreviewBox: {
    gap: 8,
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  input: {
    width: "100%",
  },
  attrRow: {
    flexDirection: "row",
    gap: 8,
  },
  attrInput: {
    flex: 1,
  },
  actions: {
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

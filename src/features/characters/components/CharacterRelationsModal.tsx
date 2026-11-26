import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Chip,
  Dialog,
  Divider,
  HelperText,
  Portal,
  Surface,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";
import { IconButton } from "../../../shared/components/Controls";
import { Button, TextInput } from "../../../shared/components/Controls";
import { accountErrorMessage } from "../../../shared/api/account";
import type { CharacterRecord } from "../services/characterService";
import type {
  CharacterOrganizationRecord,
  OrganizationOption,
} from "../../character-organizations/services/characterOrganizationService";
import type { CharacterRelationshipRecord } from "../../character-relationships/services/characterRelationshipService";

interface CharacterRelationsModalProps {
  visible: boolean;
  character: CharacterRecord | null;
  allCharacters: CharacterRecord[];
  organizations: OrganizationOption[];
  characterOrganizations: CharacterOrganizationRecord[];
  relationships: CharacterRelationshipRecord[];
  busy: boolean;
  onDismiss: () => void;
  onAddOrganization: (payload: {
    characterId: string;
    organizationId: string;
    role?: string | null;
    joinedAt?: string | null;
    isActive: boolean;
  }) => Promise<unknown>;
  onUpdateOrganization: (params: {
    linkId: string;
    payload: {
      role?: string | null;
      joinedAt?: string | null;
      isActive: boolean;
    };
  }) => Promise<unknown>;
  onRemoveOrganization: (linkId: string) => Promise<unknown>;
  onSaveRelationship: (params: {
    relationshipId?: string;
    payload: {
      sourceCharacterId: string;
      targetCharacterId: string;
      type: string;
      description?: string | null;
      level?: number | null;
    };
  }) => Promise<unknown>;
  onRemoveRelationship: (relationshipId: string) => Promise<unknown>;
}

const RELATIONSHIP_PRESETS = [
  "Aliado",
  "Rival",
  "Mentor",
  "Família",
  "Par Romântico",
  "Inimigo",
];

export function CharacterRelationsModal({
  visible,
  character,
  allCharacters,
  organizations,
  characterOrganizations,
  relationships,
  busy,
  onDismiss,
  onAddOrganization,
  onUpdateOrganization,
  onRemoveOrganization,
  onSaveRelationship,
  onRemoveRelationship,
}: CharacterRelationsModalProps) {
  const theme = useTheme();

  // Estado Organização (Criar / Editar)
  const [editingOrgLinkId, setEditingOrgLinkId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgRole, setOrgRole] = useState("");
  const [orgJoinedAt, setOrgJoinedAt] = useState("");
  const [orgIsActive, setOrgIsActive] = useState(true);

  // Estado Relacionamento (Criar / Editar)
  const [editingRelationshipId, setEditingRelationshipId] = useState<
    string | null
  >(null);
  const [targetCharId, setTargetCharId] = useState("");
  const [relType, setRelType] = useState("Aliado");
  const [relDescription, setRelDescription] = useState("");
  const [relLevel, setRelLevel] = useState("5");
  const [error, setError] = useState("");

  if (!character) return null;

  const myOrgLinks = characterOrganizations.filter(
    (link) => link.characterId === character.id,
  );
  const availableOrgs = organizations.filter(
    (org) => !myOrgLinks.some((link) => link.organizationId === org.id),
  );
  const myRelationships = relationships.filter(
    (rel) =>
      rel.sourceCharacterId === character.id ||
      rel.targetCharacterId === character.id,
  );
  const otherCharacters = allCharacters.filter(
    (item) => item.id !== character.id,
  );

  const orgNameById = new Map(organizations.map((o) => [o.id, o.name]));
  const charNameById = new Map(allCharacters.map((c) => [c.id, c.name]));

  function resetOrgForm() {
    setEditingOrgLinkId(null);
    setSelectedOrgId("");
    setOrgRole("");
    setOrgJoinedAt("");
    setOrgIsActive(true);
  }

  function startEditOrganization(link: CharacterOrganizationRecord) {
    setError("");
    setEditingOrgLinkId(link.id);
    setSelectedOrgId(link.organizationId);
    setOrgRole(link.role ?? "");
    setOrgJoinedAt(link.joinedAt ?? "");
    setOrgIsActive(link.isActive !== false);
  }

  async function handleSubmitOrganization() {
    if (!character) return;
    if (!editingOrgLinkId && !selectedOrgId) {
      setError("Selecione uma organização para vincular.");
      return;
    }
    setError("");
    try {
      if (editingOrgLinkId) {
        await onUpdateOrganization({
          linkId: editingOrgLinkId,
          payload: {
            role: orgRole.trim() || null,
            joinedAt: orgJoinedAt.trim() || null,
            isActive: orgIsActive,
          },
        });
      } else {
        await onAddOrganization({
          characterId: character.id,
          organizationId: selectedOrgId,
          role: orgRole.trim() || null,
          joinedAt: orgJoinedAt.trim() || null,
          isActive: orgIsActive,
        });
      }
      resetOrgForm();
    } catch (cause) {
      setError(accountErrorMessage(cause));
    }
  }

  function resetRelationshipForm() {
    setEditingRelationshipId(null);
    setTargetCharId("");
    setRelType("Aliado");
    setRelDescription("");
    setRelLevel("5");
  }

  function startEditRelationship(rel: CharacterRelationshipRecord) {
    if (!character) return;
    setError("");
    const otherId =
      rel.sourceCharacterId === character.id
        ? rel.targetCharacterId
        : rel.sourceCharacterId;
    setEditingRelationshipId(rel.id);
    setTargetCharId(otherId);
    setRelType(rel.type);
    setRelDescription(rel.description ?? "");
    setRelLevel(rel.level ? String(rel.level) : "5");
  }

  async function handleSubmitRelationship() {
    if (!character || !targetCharId) {
      setError("Selecione outro personagem para o relacionamento.");
      return;
    }
    if (!relType.trim()) {
      setError("Informe o tipo de relacionamento.");
      return;
    }
    setError("");
    try {
      const parsedLevel = parseInt(relLevel, 10);
      await onSaveRelationship({
        relationshipId: editingRelationshipId ?? undefined,
        payload: {
          sourceCharacterId: character.id,
          targetCharacterId: targetCharId,
          type: relType.trim(),
          description: relDescription.trim() || null,
          level:
            Number.isFinite(parsedLevel) &&
            parsedLevel >= 1 &&
            parsedLevel <= 10
              ? parsedLevel
              : null,
        },
      });
      resetRelationshipForm();
    } catch (cause) {
      setError(accountErrorMessage(cause));
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
        <Dialog.Title>Vínculos de {character.name}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Organizações Vinculadas
            </Text>

            {myOrgLinks.length === 0 ? (
              <Text variant="bodySmall" style={styles.muted}>
                Nenhuma organização vinculada a este personagem.
              </Text>
            ) : (
              myOrgLinks.map((link) => (
                <Surface key={link.id} style={styles.linkCard} elevation={1}>
                  <View style={styles.linkInfo}>
                    <Text variant="labelLarge">
                      {orgNameById.get(link.organizationId) ?? "Organização"}
                      {!link.isActive ? " (Inativo)" : ""}
                    </Text>
                    <Text variant="bodySmall" style={styles.muted}>
                      {[
                        link.role,
                        link.joinedAt,
                        link.isActive ? "Participação ativa" : "Inativo",
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </Text>
                  </View>
                  <IconButton
                    icon="pencil-outline"
                    disabled={busy}
                    onPress={() => startEditOrganization(link)}
                  />
                  <IconButton
                    icon="delete-outline"
                    iconColor={theme.colors.error}
                    disabled={busy}
                    onPress={() => {
                      if (editingOrgLinkId === link.id) resetOrgForm();
                      void onRemoveOrganization(link.id);
                    }}
                  />
                </Surface>
              ))
            )}

            {editingOrgLinkId || availableOrgs.length > 0 ? (
              <View style={styles.formBox}>
                <Text variant="labelMedium">
                  {editingOrgLinkId
                    ? `Editando participação em ${orgNameById.get(selectedOrgId) ?? "Organização"}:`
                    : "Adicionar organização:"}
                </Text>

                {!editingOrgLinkId ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    {availableOrgs.map((org) => (
                      <Chip
                        key={org.id}
                        selected={selectedOrgId === org.id}
                        onPress={() => setSelectedOrgId(org.id)}
                      >
                        {org.name}
                      </Chip>
                    ))}
                  </ScrollView>
                ) : null}

                <View style={styles.row}>
                  <TextInput
                    mode="outlined"
                    label="Papel / Cargo"
                    value={orgRole}
                    onChangeText={setOrgRole}
                    style={styles.flex}
                  />
                  <TextInput
                    mode="outlined"
                    label="Data de entrada"
                    value={orgJoinedAt}
                    onChangeText={setOrgJoinedAt}
                    placeholder="Ex: Ano 12"
                    style={styles.flex}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text variant="bodyMedium">Participação ativa</Text>
                  <Switch
                    value={orgIsActive}
                    onValueChange={setOrgIsActive}
                    disabled={busy}
                  />
                </View>

                <View style={styles.row}>
                  {editingOrgLinkId ? (
                    <Button
                      mode="outlined"
                      disabled={busy}
                      onPress={resetOrgForm}
                      style={styles.flex}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                  <Button
                    mode="contained-tonal"
                    icon={editingOrgLinkId ? "content-save" : "bank-plus"}
                    disabled={busy || (!editingOrgLinkId && !selectedOrgId)}
                    onPress={() => void handleSubmitOrganization()}
                    style={styles.flex}
                  >
                    {editingOrgLinkId
                      ? "Salvar Participação"
                      : "Vincular Organização"}
                  </Button>
                </View>
              </View>
            ) : null}

            <Divider style={styles.divider} />

            <Text variant="titleSmall" style={styles.sectionTitle}>
              Relacionamentos entre Personagens
            </Text>

            {myRelationships.length === 0 ? (
              <Text variant="bodySmall" style={styles.muted}>
                Nenhum relacionamento registrado.
              </Text>
            ) : (
              myRelationships.map((rel) => {
                const otherId =
                  rel.sourceCharacterId === character.id
                    ? rel.targetCharacterId
                    : rel.sourceCharacterId;
                return (
                  <Surface key={rel.id} style={styles.linkCard} elevation={1}>
                    <View style={styles.linkInfo}>
                      <Text variant="labelLarge">
                        {charNameById.get(otherId) ?? "Personagem"} — {rel.type}
                        {rel.level ? ` (Nível ${rel.level}/10)` : ""}
                      </Text>
                      {rel.description ? (
                        <Text variant="bodySmall" style={styles.muted}>
                          {rel.description}
                        </Text>
                      ) : null}
                    </View>
                    <IconButton
                      icon="pencil-outline"
                      disabled={busy}
                      onPress={() => startEditRelationship(rel)}
                    />
                    <IconButton
                      icon="delete-outline"
                      iconColor={theme.colors.error}
                      disabled={busy}
                      onPress={() => {
                        if (editingRelationshipId === rel.id)
                          resetRelationshipForm();
                        void onRemoveRelationship(rel.id);
                      }}
                    />
                  </Surface>
                );
              })
            )}

            {otherCharacters.length > 0 ? (
              <View style={styles.formBox}>
                <Text variant="labelMedium">
                  {editingRelationshipId
                    ? "Editando relacionamento:"
                    : "Novo relacionamento:"}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {otherCharacters.map((other) => (
                    <Chip
                      key={other.id}
                      selected={targetCharId === other.id}
                      onPress={() => setTargetCharId(other.id)}
                    >
                      {other.name}
                    </Chip>
                  ))}
                </ScrollView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {RELATIONSHIP_PRESETS.map((preset) => (
                    <Chip
                      key={preset}
                      selected={relType === preset}
                      onPress={() => setRelType(preset)}
                    >
                      {preset}
                    </Chip>
                  ))}
                </ScrollView>
                <View style={styles.row}>
                  <TextInput
                    mode="outlined"
                    label="Tipo"
                    value={relType}
                    onChangeText={setRelType}
                    style={styles.flex}
                  />
                  <TextInput
                    mode="outlined"
                    label="Intensidade (1-10)"
                    keyboardType="numeric"
                    value={relLevel}
                    onChangeText={setRelLevel}
                    style={{ width: 130 }}
                  />
                </View>
                <TextInput
                  mode="outlined"
                  label="Descrição do vínculo"
                  value={relDescription}
                  onChangeText={setRelDescription}
                  placeholder="Histórico ou dinâmica entre eles..."
                />
                <View style={styles.row}>
                  {editingRelationshipId ? (
                    <Button
                      mode="outlined"
                      disabled={busy}
                      onPress={resetRelationshipForm}
                      style={styles.flex}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                  <Button
                    mode="contained-tonal"
                    icon={
                      editingRelationshipId ? "content-save" : "account-heart"
                    }
                    disabled={busy || !targetCharId}
                    onPress={() => void handleSubmitRelationship()}
                    style={styles.flex}
                  >
                    {editingRelationshipId
                      ? "Salvar Relacionamento"
                      : "Adicionar Relacionamento"}
                  </Button>
                </View>
              </View>
            ) : null}

            {error ? <HelperText type="error">{error}</HelperText> : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={{ flexWrap: "wrap", gap: 8 }}>
          <Button disabled={busy} onPress={onDismiss}>
            Fechar
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
  scrollArea: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: {
    gap: 10,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontWeight: "700",
  },
  muted: {
    opacity: 0.72,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  linkInfo: {
    flex: 1,
  },
  formBox: {
    gap: 8,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  flex: {
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
});

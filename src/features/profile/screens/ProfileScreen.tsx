import { authorWebsite, openAuthorWebsite } from "../services/profile-website";
import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, HelperText, Text, TextInput } from "react-native-paper";
import { Screen } from "../../../shared/components/Screen";
import { ProfileAvatar } from "../../../shared/components/ProfileAvatar";
import { chooseProfilePhoto } from "../services/profile-photo";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { accountErrorMessage } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
import {
  loadProfile,
  saveProfile,
  type Profile,
} from "../services/profile-api";

export function ProfileScreen() {
  const [editing, setEditing] = useState(false);
  const userId = useAuthStore((state) => state.session?.user.id ?? "");
  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: ({ signal }) => loadProfile(signal),
    enabled: Boolean(userId),
  });
  if (!query.data)
    return (
      <AccountQueryStatus
        error={query.error}
        fetchStatus={query.fetchStatus}
        retry={() => void query.refetch()}
      />
    );
  return editing ? (
    <ProfileForm
      key={userId}
      profile={query.data}
      onClose={() => setEditing(false)}
    />
  ) : (
    <ProfileDetails profile={query.data} onEdit={() => setEditing(true)} />
  );
}

function ProfileDetails({
  profile,
  onEdit,
}: {
  profile: Profile;
  onEdit: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const website = authorWebsite(profile.websiteUrl ?? "");
  return (
    <Screen>
      <Text variant="headlineMedium" accessibilityRole="header">
        Meu perfil
      </Text>
      <ProfileAvatar
        uri={profile.avatarImage}
        name={profile.displayName}
        size={112}
      />
      <Text variant="headlineSmall">{profile.displayName}</Text>
      <Text>@{profile.username}</Text>
      <Text>{profile.email}</Text>
      {profile.penName ? (
        <>
          <Text variant="titleMedium">Pseudônimo</Text>
          <Text>{profile.penName}</Text>
        </>
      ) : null}
      <Text variant="titleMedium">Sobre mim</Text>
      <Text>
        {profile.bio?.trim() || "Sua biografia ainda não foi preenchida."}
      </Text>
      {profile.quote ? (
        <>
          <Text variant="titleMedium">Minha frase</Text>
          <Text>{profile.quote}</Text>
        </>
      ) : null}
      <Text variant="titleMedium">Gêneros favoritos</Text>
      {profile.favoriteGenres?.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {profile.favoriteGenres.map((item) => (
            <Chip key={item}>{item}</Chip>
          ))}
        </View>
      ) : (
        <Text>Nenhum gênero informado.</Text>
      )}
      {website ? (
        <Button
          icon="open-in-new"
          mode="outlined"
          loading={opening}
          disabled={opening}
          onPress={async () => {
            setOpening(true);
            setError("");
            try {
              await openAuthorWebsite(website);
            } catch (cause) {
              setError(accountErrorMessage(cause));
            } finally {
              setOpening(false);
            }
          }}
        >
          Visitar site do autor
        </Button>
      ) : null}
      {error ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {error}
        </HelperText>
      ) : null}
      <Button mode="contained" onPress={onEdit}>
        Editar perfil
      </Button>
    </Screen>
  );
}

function ProfileForm({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarImage, setAvatarImage] = useState(profile.avatarImage ?? "");
  const [penName, setPenName] = useState(profile.penName ?? "");
  const [quote, setQuote] = useState(profile.quote ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [favoriteGenres, setFavoriteGenres] = useState(
    profile.favoriteGenres ?? [],
  );
  const [genre, setGenre] = useState("");
  const [validation, setValidation] = useState("");
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const save = useMutation({
    mutationFn: saveProfile,
    onSuccess(updated) {
      client.setQueryData(["profile", profile.id], updated);
      onClose();
      useAuthStore.setState((state) =>
        state.session?.user.id === updated.id
          ? {
              session: {
                ...state.session,
                user: {
                  ...state.session.user,
                  displayName: updated.displayName,
                },
              },
            }
          : {},
      );
    },
  });
  const busy = save.isPending || choosingPhoto;

  async function choosePhoto() {
    if (busy) return;
    setPhotoError("");
    setChoosingPhoto(true);
    try {
      const photo = await chooseProfilePhoto();
      if (photo) setAvatarImage(photo);
    } catch (cause) {
      setPhotoError(accountErrorMessage(cause));
    } finally {
      setChoosingPhoto(false);
    }
  }

  function submit() {
    if (busy) return;
    setValidation("");
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(username.trim())) {
      return setValidation(
        "Use de 3 a 50 letras, números, pontos, traços ou sublinhados no nome de usuário.",
      );
    }
    if (!displayName.trim())
      return setValidation("Informe seu nome de exibição.");
    if (websiteUrl.trim() && !authorWebsite(websiteUrl)) {
      return setValidation(
        "Informe um site começando com http:// ou https://, sem usuário ou senha no endereço.",
      );
    }
    save.mutate({
      username: username.trim(),
      displayName: displayName.trim(),
      bio,
      avatarImage: avatarImage.trim() || null,
      penName,
      quote,
      websiteUrl: websiteUrl.trim(),
      favoriteGenres,
    });
  }

  return (
    <Screen>
      <Text variant="headlineMedium" accessibilityRole="header">
        Meu perfil
      </Text>
      <Text>{profile.email}</Text>
      <ProfileAvatar uri={avatarImage} name={displayName} size={96} />
      <Button
        disabled={busy}
        loading={choosingPhoto}
        onPress={() => void choosePhoto()}
      >
        Escolher foto
      </Button>
      {avatarImage ? (
        <Button
          disabled={busy}
          onPress={() => {
            setAvatarImage("");
            setPhotoError("");
          }}
        >
          Remover foto
        </Button>
      ) : null}
      <Text>A foto será atualizada ao salvar o perfil.</Text>
      {photoError ? <HelperText type="error">{photoError}</HelperText> : null}
      <TextInput
        mode="outlined"
        label="Nome de usuário"
        accessibilityLabel="Nome de usuário"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        maxLength={50}
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="Nome de exibição"
        accessibilityLabel="Nome de exibição"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={100}
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="Pseudônimo"
        accessibilityLabel="Pseudônimo"
        value={penName}
        onChangeText={setPenName}
        maxLength={100000}
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="Biografia"
        accessibilityLabel="Biografia"
        multiline
        value={bio}
        onChangeText={setBio}
        maxLength={100000}
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="URL da foto"
        accessibilityLabel="URL da foto"
        autoCapitalize="none"
        value={avatarImage.startsWith("data:image/") ? "" : avatarImage}
        onChangeText={setAvatarImage}
        maxLength={2000000}
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="Frase"
        accessibilityLabel="Frase"
        value={quote}
        onChangeText={setQuote}
        maxLength={100000}
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="Site"
        accessibilityLabel="Site"
        autoCapitalize="none"
        keyboardType="url"
        value={websiteUrl}
        onChangeText={setWebsiteUrl}
        maxLength={100000}
        disabled={busy}
      />
      <Text variant="titleMedium">Gêneros favoritos</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {favoriteGenres.map((item, index) => (
          <Chip
            key={index}
            disabled={busy}
            accessibilityLabel={item}
            closeIconAccessibilityLabel={"Remover " + item}
            onClose={() =>
              setFavoriteGenres(
                favoriteGenres.filter((_, itemIndex) => itemIndex !== index),
              )
            }
          >
            {item}
          </Chip>
        ))}
      </View>
      <TextInput
        mode="outlined"
        label="Adicionar gênero"
        accessibilityLabel="Adicionar gênero"
        value={genre}
        onChangeText={setGenre}
        maxLength={100}
        disabled={save.isPending || favoriteGenres.length >= 50}
      />
      <Button
        disabled={
          save.isPending || !genre.trim() || favoriteGenres.length >= 50
        }
        onPress={() => {
          if (!favoriteGenres.includes(genre.trim()))
            setFavoriteGenres([...favoriteGenres, genre.trim()]);
          setGenre("");
        }}
      >
        Adicionar gênero
      </Button>
      {validation || save.error ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {validation || accountErrorMessage(save.error)}
        </HelperText>
      ) : null}
      {save.isSuccess ? (
        <Text accessibilityLiveRegion="polite">Perfil salvo.</Text>
      ) : null}
      <Button
        mode="contained"
        disabled={busy}
        loading={save.isPending}
        onPress={submit}
      >
        Salvar perfil
      </Button>
      <Button disabled={busy} onPress={onClose}>
        Cancelar edição
      </Button>
    </Screen>
  );
}

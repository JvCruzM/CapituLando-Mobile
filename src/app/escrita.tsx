import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, useSegments, type Href } from 'expo-router';
import {
  WritingScreen,
  fetchStoriesFromApi,
  readTokenFromSecureStore,
  type WritingRecoveryState,
  type WritingStorySummary,
} from '../features/writing';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const ENTRAR_ROUTE = '/entrar' as Href;

export default function EscritaRoute() {
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams<{ storyId?: string }>();

  const authState = useAuthStore();
  const storeUser = authState?.user;
  const storeToken = authState?.token ?? authState?.accessToken ?? null;
  const isAuthenticatedStore =
    typeof authState?.isAuthenticated === 'boolean'
      ? authState.isAuthenticated
      : Boolean(storeUser?.id || storeToken);

  const [checkingSession, setCheckingSession] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [stories, setStories] = useState<WritingStorySummary[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [remoteRecovery, setRemoteRecovery] =
    useState<WritingRecoveryState | null>(null);

  // Proteção de navegação para a rota de escrita
  useEffect(() => {
    const currentRoute = segments.join('/');
    const isWritingRoute =
      currentRoute === 'escrita' || currentRoute.endsWith('/escrita');

    if (isWritingRoute && !checkingSession && !resolvedUserId) {
      router.replace(ENTRAR_ROUTE);
    }
  }, [checkingSession, resolvedUserId, router, segments]);

  useEffect(() => {
    let active = true;

    async function hydrateSessionAndStories() {
      setCheckingSession(true);
      try {
        const secureToken = storeToken || (await readTokenFromSecureStore());
        const userObj = storeUser as
          | { id?: string; userId?: string; sub?: string }
          | undefined;
        const uid =
          userObj?.id ||
          userObj?.userId ||
          userObj?.sub ||
          (secureToken && isAuthenticatedStore
            ? `user_${secureToken.slice(-10)}`
            : null);

        if (!uid) {
          if (active) {
            setResolvedUserId(null);
            setResolvedToken(null);
          }
          router.replace(ENTRAR_ROUTE);
          return;
        }

        if (!active) return;
        const cleanUserId = String(uid);
        setResolvedUserId(cleanUserId);
        setResolvedToken(secureToken ?? null);

        let loadedStories: WritingStorySummary[] = [];
        if (API_BASE_URL) {
          loadedStories = await fetchStoriesFromApi({
            baseUrl: API_BASE_URL,
            token: secureToken ?? null,
            userId: cleanUserId,
            sessionId: `route_${Date.now()}`,
          }).catch(() => []);
        }

        if (loadedStories.length === 0) {
          const cachedProjectsRaw = await AsyncStorage.getItem(
            `capitulando:${cleanUserId}:projects`,
          );
          if (cachedProjectsRaw) {
            const parsed = JSON.parse(cachedProjectsRaw);
            if (Array.isArray(parsed)) {
              loadedStories = parsed.map(
                (p: { id: string; title: string; genre?: string }) => ({
                  id: String(p.id),
                  title: String(p.title),
                  genre: p.genre,
                }),
              );
            }
          }
        }

        const activeStoryKey = `capitulando:${cleanUserId}:active_story_id`;
        const storedStoryId = await AsyncStorage.getItem(activeStoryKey);
        const chosenStoryId =
          (params.storyId && String(params.storyId)) ||
          storedStoryId ||
          loadedStories[0]?.id ||
          '';

        if (!active) return;
        setStories(loadedStories);
        setSelectedStoryId(chosenStoryId);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void hydrateSessionAndStories();
    return () => {
      active = false;
    };
  }, [isAuthenticatedStore, params.storyId, router, storeToken, storeUser]);

  const handleSelectStory = useCallback(
    async (nextStoryId: string) => {
      setSelectedStoryId(nextStoryId);
      if (resolvedUserId) {
        await AsyncStorage.setItem(
          `capitulando:${resolvedUserId}:active_story_id`,
          nextStoryId,
        );
      }
    },
    [resolvedUserId],
  );

  if (checkingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#4b1d3f" />
        <Text style={styles.text}>Verificando sessão...</Text>
      </View>
    );
  }

  if (!resolvedUserId) {
    return null;
  }

  if (!selectedStoryId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Nenhum livro selecionado</Text>
        <Text style={styles.text}>
          Selecione ou crie um livro antes de abrir o espaço de escrita.
        </Text>
      </View>
    );
  }

  return (
    <WritingScreen
      userId={resolvedUserId}
      storyId={selectedStoryId}
      stories={stories}
      onSelectStory={(id) => void handleSelectStory(id)}
      apiBaseUrl={API_BASE_URL || undefined}
      authToken={resolvedToken}
      remoteRecovery={remoteRecovery}
      onRemoteRecoveryChange={setRemoteRecovery}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fcf8f2',
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4b1d3f',
  },
  text: {
    fontSize: 13,
    color: '#57534e',
    textAlign: 'center',
  },
});
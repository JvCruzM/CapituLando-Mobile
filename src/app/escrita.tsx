import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import {
  WritingScreen,
  fetchStoriesFromApi,
  type WritingRecoveryState,
  type WritingStorySummary,
} from '../features/writing';

interface SessionUser {
  id: string;
  token?: string | null;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const LOGIN_ROUTE = '/login' as Href;

export default function EscritaRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storyId?: string }>();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [stories, setStories] = useState<WritingStorySummary[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [remoteRecovery, setRemoteRecovery] = useState<WritingRecoveryState | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSessionAndStories() {
      try {
        const rawUser = await AsyncStorage.getItem('capitulando_auth_user');
        const token = await AsyncStorage.getItem('capitulando_access_token');

        if (!rawUser && !token) {
          router.replace(LOGIN_ROUTE);
          return;
        }

        let parsedUser: SessionUser | null = null;
        if (rawUser) {
          const obj = JSON.parse(rawUser) as { id?: string; userId?: string; sub?: string };
          const resolvedId = obj.id || obj.userId || obj.sub;
          if (resolvedId) {
            parsedUser = { id: String(resolvedId), token };
          }
        }

        if (!parsedUser && token) {
          parsedUser = { id: `user_${token.slice(-10)}`, token };
        }

        if (!parsedUser) {
          router.replace(LOGIN_ROUTE);
          return;
        }

        if (!active) return;
        setSessionUser(parsedUser);

        let loadedStories: WritingStorySummary[] = [];
        if (API_BASE_URL) {
          loadedStories = await fetchStoriesFromApi({
            baseUrl: API_BASE_URL,
            token: parsedUser.token,
            userId: parsedUser.id,
            sessionId: `route_${Date.now()}`,
          }).catch(() => []);
        }

        if (loadedStories.length === 0) {
          const cachedProjectsRaw = await AsyncStorage.getItem('capitulando_projects');
          if (cachedProjectsRaw) {
            const parsed = JSON.parse(cachedProjectsRaw);
            if (Array.isArray(parsed)) {
              loadedStories = parsed.map((p: { id: string; title: string; genre?: string }) => ({
                id: String(p.id),
                title: String(p.title),
                genre: p.genre,
              }));
            }
          }
        }

        const activeStoryFromStorage = await AsyncStorage.getItem('capitulando_active_story_id');
        const chosenStoryId =
          (params.storyId && String(params.storyId)) ||
          activeStoryFromStorage ||
          loadedStories[0]?.id ||
          '';

        if (!active) return;
        setStories(loadedStories);
        setSelectedStoryId(chosenStoryId);
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void loadSessionAndStories();
    return () => {
      active = false;
    };
  }, [params.storyId, router]);

  const handleSelectStory = useCallback(async (nextStoryId: string) => {
    setSelectedStoryId(nextStoryId);
    await AsyncStorage.setItem('capitulando_active_story_id', nextStoryId);
  }, []);

  if (checkingAuth) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#4b1d3f" />
        <Text style={styles.text}>Verificando sessão do escritor...</Text>
      </View>
    );
  }

  if (!sessionUser) {
    return null;
  }

  if (!selectedStoryId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Nenhum livro selecionado</Text>
        <Text style={styles.text}>
          Crie ou selecione um livro nos seus projetos antes de abrir o espaço de escrita.
        </Text>
      </View>
    );
  }

  return (
    <WritingScreen
      userId={sessionUser.id}
      storyId={selectedStoryId}
      stories={stories}
      onSelectStory={(id) => void handleSelectStory(id)}
      apiBaseUrl={API_BASE_URL || undefined}
      authToken={sessionUser.token}
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
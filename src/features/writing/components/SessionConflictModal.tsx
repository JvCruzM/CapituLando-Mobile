import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, GitMerge } from 'lucide-react-native';
import type { WritingSessionConflict } from '../types';
import { countWords } from '../writing-store';

interface Props {
  conflict: WritingSessionConflict | null;
  isDark: boolean;
  onResolve: (choice: 'local' | 'remote' | 'merge') => void;
}

export function SessionConflictModal({ conflict, isDark, onResolve }: Props) {
  if (!conflict) return null;

  const bgCard = isDark ? '#1a1120' : '#fcf8f2';
  const bgBox = isDark ? '#24172d' : '#ffffff';
  const textPrimary = isDark ? '#f5f5f4' : '#1c1917';
  const textMuted = isDark ? '#a8a29e' : '#57534e';
  const accent = isDark ? '#9d174d' : '#4b1d3f';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: bgCard }]}>
          <View style={styles.header}>
            <AlertTriangle size={20} color="#d97706" />
            <Text style={[styles.title, { color: textPrimary }]}>
              Conflito entre Sessões
            </Text>
          </View>

          <Text style={[styles.desc, { color: textMuted }]}>
            Foi detectada uma alteração feita em outra sessão ativa. Escolha qual versão manter:
          </Text>

          <View style={[styles.box, { backgroundColor: bgBox }]}>
            <Text style={[styles.boxLabel, { color: accent }]}>
              Sessão Local ({countWords(conflict.local.content)} palavras)
            </Text>
            <Text numberOfLines={3} style={[styles.boxText, { color: textPrimary }]}>
              {conflict.local.content || '(Sem texto)'}
            </Text>
          </View>

          <View style={[styles.box, { backgroundColor: bgBox }]}>
            <Text style={[styles.boxLabel, { color: accent }]}>
              Outra Sessão ({countWords(conflict.remote.content)} palavras)
            </Text>
            <Text numberOfLines={3} style={[styles.boxText, { color: textPrimary }]}>
              {conflict.remote.content || '(Sem texto)'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent }]}
            onPress={() => onResolve('local')}
          >
            <Text style={styles.btnLightText}>Manter Sessão Local</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: bgBox }]}
            onPress={() => onResolve('remote')}
          >
            <Text style={[styles.btnDarkText, { color: textPrimary }]}>
              Usar Outra Sessão
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#fef3c7' }]}
            onPress={() => onResolve('merge')}
          >
            <GitMerge size={15} color="#92400e" />
            <Text style={[styles.btnDarkText, { color: '#92400e' }]}>
              Mesclar Ambas as Versões
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
  },
  box: {
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  boxText: {
    fontSize: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    padding: 12,
  },
  btnLightText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDarkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
import { useLocalSearchParams } from 'expo-router';
import { Card, Text } from 'react-native-paper';
import { Screen } from '../../../../src/shared/components/Screen';
export default function ChaptersScreen(){ const {title}=useLocalSearchParams<{id:string;title?:string}>(); return <Screen><Text variant="headlineMedium">{title || 'Capítulos'}</Text><Text variant="bodyMedium">Capítulos deste projeto.</Text><Card><Card.Content><Text variant="titleMedium">Capítulo 1 — O começo</Text><Text>O conteúdo dos capítulos será carregado pela integração com a API.</Text></Card.Content></Card><Card><Card.Content><Text variant="titleMedium">Capítulo 2 — Novos caminhos</Text><Text>Área preparada para visualizar e editar capítulos.</Text></Card.Content></Card></Screen> }

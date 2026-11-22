import { StyleSheet, View } from 'react-native';
import { Button, Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { Screen } from '../../../../src/shared/components/Screen';

export default function HomeScreen() {
  const theme = useTheme();
  return <Screen>
    <Text variant="headlineMedium">Meu espaço de escrita</Text>
    <Text variant="bodyMedium">Acompanhe suas histórias, ideias e objetivos.</Text>
    <View style={styles.grid}>
      <Card style={styles.card}><Card.Content><Text variant="labelLarge">Histórias</Text><Text variant="headlineLarge">3</Text><Text variant="bodySmall">projetos em andamento</Text></Card.Content></Card>
      <Card style={styles.card}><Card.Content><Text variant="labelLarge">Ideias</Text><Text variant="headlineLarge">8</Text><Text variant="bodySmall">ideias registradas</Text></Card.Content></Card>
      <Card style={styles.card}><Card.Content><Text variant="labelLarge">Metas</Text><Text variant="headlineLarge">2/5</Text><Text variant="bodySmall">concluídas</Text></Card.Content></Card>
    </View>
    <Card><Card.Content><Text variant="titleMedium">Progresso geral</Text><ProgressBar progress={0.4} color={theme.colors.primary} style={styles.progress}/><Text variant="bodySmall">40% das metas concluídas (dados demonstrativos)</Text></Card.Content></Card>
    <Button mode="contained" onPress={() => router.push('/historias')}>Minhas histórias</Button>
    <Button mode="outlined" onPress={() => router.push('/ideias')}>Minhas ideias</Button>
    <Button mode="outlined" onPress={() => router.push('/metas')}>Minhas metas</Button>
  </Screen>;
}
const styles = StyleSheet.create({ grid:{flexDirection:'row',flexWrap:'wrap',gap:10}, card:{flex:1,minWidth:130}, progress:{height:9,borderRadius:8,marginVertical:12} });

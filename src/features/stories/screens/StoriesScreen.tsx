import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { Screen } from '../../../../src/shared/components/Screen';
const stories = [{id:'1',title:'O jardim das lembranças',genre:'Fantasia',status:'Em andamento',description:'Uma história sobre memórias e descobertas.'},{id:'2',title:'Entre páginas',genre:'Romance',status:'Rascunho',description:'Dois caminhos que se encontram numa biblioteca.'}];
export default function StoriesScreen(){ return <Screen><Text variant="headlineMedium">Histórias e livros</Text><Text variant="bodyMedium">Seus projetos de escrita.</Text>{stories.map(s=><Card key={s.id} style={styles.card}><Card.Content><Text variant="titleLarge">{s.title}</Text><View style={styles.row}><Chip>{s.genre}</Chip><Chip>{s.status}</Chip></View><Text>{s.description}</Text><Button onPress={()=>router.push({pathname:'/capitulos/[id]',params:{id:s.id,title:s.title}})}>Ver capítulos</Button></Card.Content></Card>)}</Screen> }
const styles=StyleSheet.create({card:{marginTop:12},row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:10}});

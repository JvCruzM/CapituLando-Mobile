import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { Screen } from '../../../../src/shared/components/Screen';
export default function IdeasScreen(){ const [draft,setDraft]=useState(''); const [ideas,setIdeas]=useState(['Uma cidade construída sobre árvores','Uma personagem que coleciona cartas']); const add=()=>{if(draft.trim()){setIdeas(v=>[draft.trim(),...v]);setDraft('')}}; return <Screen><Text variant="headlineMedium">Minhas ideias</Text><Text variant="bodyMedium">Anote inspirações para suas histórias.</Text><TextInput label="Nova ideia" value={draft} onChangeText={setDraft} multiline/><Button mode="contained" onPress={add}>Adicionar ideia</Button>{ideas.map((idea,i)=><Card key={`${idea}-${i}`} style={styles.card}><Card.Content><Text>{idea}</Text><View style={styles.actions}><Button compact onPress={()=>setIdeas(v=>v.filter((_,n)=>n!==i))}>Excluir</Button></View></Card.Content></Card>)}</Screen> }
const styles=StyleSheet.create({card:{marginTop:10},actions:{alignItems:'flex-end'}});

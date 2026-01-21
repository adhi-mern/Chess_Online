import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function LobbyScreen() {
  const [joinId, setJoinId] = useState('');
  const router = useRouter();

  const createGame = () => {
    const newId = Math.random().toString(36).substring(2, 7).toUpperCase();
    router.push({ pathname: '/chess', params: { gameId: newId, color: 'w' } });
  };

  const joinGame = () => {
    if (joinId.trim()) {
      router.push({ pathname: '/chess', params: { gameId: joinId.toUpperCase(), color: 'b' } });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chess Online</Text>
      <TouchableOpacity style={styles.button} onPress={createGame}>
        <Text style={styles.buttonText}>Create New Game</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TextInput
        style={styles.input}
        placeholder="Enter Game ID"
        placeholderTextColor="#666"
        value={joinId}
        onChangeText={setJoinId}
        autoCapitalize="characters"
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: '#444' }]} onPress={joinGame}>
        <Text style={styles.buttonText}>Join Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1c', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, color: 'white', fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  button: { backgroundColor: '#769656', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: '#333', color: 'white', padding: 15, borderRadius: 8, marginBottom: 10, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#444', marginVertical: 30 },
});
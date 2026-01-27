import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ref, push, onValue, set, remove, get, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LobbyScreen() {
  const [joinId, setJoinId] = useState('');
  const [selectedTime, setSelectedTime] = useState(300);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(60);
  const router = useRouter();

  const startRandomMatch = async () => {
    setIsSearching(true);
    setSearchTimer(60);
    const timeStr = selectedTime.toString();
    const queueRef = ref(db, `queue/${timeStr}`);

    const snapshot = await get(queueRef);
    const waitingPlayers = snapshot.val();

    if (waitingPlayers) {
      // Found someone! Join their game
      const firstKey = Object.keys(waitingPlayers)[0];
      const matchData = waitingPlayers[firstKey];
      await remove(ref(db, `queue/${timeStr}/${firstKey}`));
      setIsSearching(false);
      router.push({ pathname: '/chess', params: { gameId: matchData.gameId, color: 'b', timeLimit: timeStr } });
    } else {
      // No one waiting, create a room and wait
      const newGameId = Math.random().toString(36).substring(2, 7).toUpperCase();
      const myQueueRef = push(queueRef);
      await set(myQueueRef, { gameId: newGameId });

      const gameListenRef = ref(db, `games/${newGameId}/hasOpponent`);
      const unsubscribe = onValue(gameListenRef, (snap) => {
        if (snap.val() === true) {
          off(gameListenRef);
          setIsSearching(false);
          router.push({ pathname: '/chess', params: { gameId: newGameId, color: 'w', timeLimit: timeStr } });
        }
      });

      // 60s Timeout logic
      setTimeout(async () => {
        const check = await get(myQueueRef);
        if (check.exists()) {
          await remove(myQueueRef);
          setIsSearching(false);
          Alert.alert("No players online", "Try again or create a private room.");
        }
      }, 60000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHESS ONLINE</Text>
      
      <View style={styles.timeRow}>
        {[180, 300, 600].map((s) => (
          <TouchableOpacity key={s} style={[styles.timeBtn, selectedTime === s && styles.activeTime]} onPress={() => setSelectedTime(s)}>
            <Text style={styles.timeBtnText}>{s/60}m</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={startRandomMatch}>
        <MaterialCommunityIcons name="shuffle-variant" size={24} color="white" />
        <Text style={styles.buttonText}> RANDOM MATCH</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#444' }]} onPress={() => {
        const id = Math.random().toString(36).substring(2, 7).toUpperCase();
        router.push({ pathname: '/chess', params: { gameId: id, color: 'w', timeLimit: selectedTime.toString() } });
      }}>
        <Text style={styles.buttonText}>CREATE PRIVATE ROOM</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="ENTER GAME ID" placeholderTextColor="#888" value={joinId} onChangeText={setJoinId} />
      <TouchableOpacity style={[styles.button, { backgroundColor: '#222' }]} onPress={() => router.push({ pathname: '/chess', params: { gameId: joinId.toUpperCase(), color: 'b' } })}>
        <Text style={styles.buttonText}>JOIN GAME</Text>
      </TouchableOpacity>

      <Modal visible={isSearching} transparent>
        <View style={styles.modalOverlay}>
          <MaterialCommunityIcons name="chess-knight" size={80} color="#769656" />
          <Text style={styles.loadingText}>Searching for opponent...</Text>
          <Text style={styles.timerText}>{searchTimer}s</Text>
          <TouchableOpacity onPress={() => setIsSearching(false)}><Text style={{color: 'white', marginTop: 20}}>CANCEL</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1c', padding: 25, justifyContent: 'center' },
  title: { fontSize: 32, color: 'white', fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  timeBtn: { flex: 1, backgroundColor: '#333', padding: 15, marginHorizontal: 5, borderRadius: 8, alignItems: 'center' },
  activeTime: { backgroundColor: '#769656' },
  timeBtnText: { color: 'white', fontWeight: 'bold' },
  button: { flexDirection: 'row', backgroundColor: '#769656', padding: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  input: { backgroundColor: '#333', color: 'white', padding: 18, borderRadius: 10, textAlign: 'center', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 18, marginTop: 20 },
  timerText: { color: '#769656', fontSize: 40, fontWeight: 'bold' }
});
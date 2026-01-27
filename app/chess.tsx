import { Chess, Square } from 'chess.js';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Image, Pressable, Text, View, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ref, onValue, set, update, onDisconnect } from 'firebase/database';
import { Audio } from 'expo-av';
import styles from '../styles/chess.styles';
import { db } from '../firebaseConfig';

const pieceImages: Record<string, any> = {
  wp: require('../assets/pieces/white-pawn.png'), wr: require('../assets/pieces/white-rook.png'),
  wn: require('../assets/pieces/white-knight.png'), wb: require('../assets/pieces/white-bishop.png'),
  wq: require('../assets/pieces/white-queen.png'), wk: require('../assets/pieces/white-king.png'),
  bp: require('../assets/pieces/black-pawn.png'), br: require('../assets/pieces/black-rook.png'),
  bn: require('../assets/pieces/black-knight.png'), bb: require('../assets/pieces/black-bishop.png'),
  bq: require('../assets/pieces/black-queen.png'), bk: require('../assets/pieces/black-king.png'),
};

export default function ChessScreen() {
  const { gameId, color, timeLimit } = useLocalSearchParams<{ gameId: string; color: 'w' | 'b', timeLimit: string }>();
  const router = useRouter();
  
  const gameRef = useRef(new Chess());
  const [board, setBoard] = useState(gameRef.current.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [whiteTime, setWhiteTime] = useState(parseInt(timeLimit || "300"));
  const [blackTime, setBlackTime] = useState(parseInt(timeLimit || "300"));
  const [gameActive, setGameActive] = useState(true);

  // Sound Refs
  const moveSound = useRef<Audio.Sound | null>(null);
  const checkSound = useRef<Audio.Sound | null>(null);
  const victorySound = useRef<Audio.Sound | null>(null);

  // Helper to play sounds reliably
  const playSfx = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.log("Sound play error:", error);
    }
  };

  useEffect(() => {
    const gameDbRef = ref(db, `games/${gameId}`);

    async function loadSounds() {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
      const { sound: mS } = await Audio.Sound.createAsync(require('../assets/sounds/Move.mp3'));
      moveSound.current = mS;
      const { sound: cS } = await Audio.Sound.createAsync(require('../assets/sounds/Check.mp3'));
      checkSound.current = cS;
      const { sound: vS } = await Audio.Sound.createAsync(require('../assets/sounds/Victory.mp3'));
      victorySound.current = vS;
    }
    loadSounds();

    if (color === 'w') {
      update(gameDbRef, {
        fen: gameRef.current.fen(),
        wTime: parseInt(timeLimit || "300"),
        bTime: parseInt(timeLimit || "300"),
        status: 'playing',
        hostOnline: true
      });
      onDisconnect(ref(db, `games/${gameId}/hostOnline`)).set(false);
    } else {
      update(gameDbRef, { hasOpponent: true, guestOnline: true });
      onDisconnect(ref(db, `games/${gameId}/guestOnline`)).set(false);
    }

    const unsubscribe = onValue(gameDbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (data.hostOnline === false && gameActive) triggerEnd("You Win! Host disconnected.");
      if (data.guestOnline === false && gameActive) triggerEnd("You Win! Opponent disconnected.");
      if (data.status === 'quit_w') triggerEnd(color === 'w' ? "You Resigned." : "Opponent Resigned.");
      if (data.status === 'quit_b') triggerEnd(color === 'b' ? "You Resigned." : "Opponent Resigned.");

      if (data.fen && data.fen !== gameRef.current.fen()) {
        gameRef.current.load(data.fen);
        setBoard(gameRef.current.board());
        setWhiteTime(data.wTime);
        setBlackTime(data.bTime);
        
        // REMOTE MOVE SOUND LOGIC
        if (gameRef.current.isCheckmate()) {
          playSfx(victorySound);
        } else if (gameRef.current.isCheck()) {
          playSfx(checkSound); // This plays on the receiving device
        } else {
          playSfx(moveSound);
        }
      }
    });

    return () => {
      unsubscribe();
      moveSound.current?.unloadAsync();
      checkSound.current?.unloadAsync();
      victorySound.current?.unloadAsync();
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      const turn = gameRef.current.turn();
      if (turn === 'w') setWhiteTime(t => (t <= 0 ? (handleTimeout('w'), 0) : t - 1));
      else setBlackTime(t => (t <= 0 ? (handleTimeout('b'), 0) : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameActive]);

  const handleTimeout = (loser: string) => {
    update(ref(db, `games/${gameId}`), { status: `timeout_${loser}` });
  };

  const triggerEnd = async (msg: string) => {
    setGameActive(false);
    if (msg.includes("Win")) playSfx(victorySound);
    Alert.alert("Game Over", msg, [{ text: "OK", onPress: () => router.replace('/') }]);
  };

  const handleQuit = () => {
    Alert.alert("Resign?", "Leave the game?", [
      { text: "STAY", style: 'cancel' },
      { text: "LEAVE", onPress: () => {
        update(ref(db, `games/${gameId}`), { 
            status: `quit_${color}`,
            [color === 'w' ? 'hostOnline' : 'guestOnline']: false 
        });
        router.replace('/');
      }}
    ]);
  };

  async function onSquarePress(square: Square) {
    if (!gameActive || gameRef.current.turn() !== color) return;

    if (!selectedSquare) {
      const piece = gameRef.current.get(square);
      if (!piece || piece.color !== color) return;
      const moves = gameRef.current.moves({ square, verbose: true });
      if (moves.length === 0) return;
      setSelectedSquare(square);
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    if (legalMoves.includes(square)) {
      const move = gameRef.current.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        setBoard(gameRef.current.board());
        update(ref(db, `games/${gameId}`), {
          fen: gameRef.current.fen(),
          wTime: whiteTime,
          bTime: blackTime
        });

        // LOCAL MOVE SOUND LOGIC
        if (gameRef.current.isCheckmate()) {
          playSfx(victorySound);
          triggerEnd("Checkmate! You Win.");
        } else if (gameRef.current.isCheck()) {
          playSfx(checkSound); // This plays on the moving device
        } else {
          playSfx(moveSound);
        }
      }
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderBoard = useMemo(() => {
    const currentBoard = [...board];
    return color === 'b' ? currentBoard.reverse() : currentBoard;
  }, [board, color]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.gameIdText}>ROOM: {gameId}</Text>
        <TouchableOpacity style={styles.quitBtn} onPress={handleQuit}>
           <Text style={{color: 'white', fontWeight: 'bold'}}>QUIT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clockContainer}>
        <Text style={styles.timerText}>{color === 'w' ? formatTime(blackTime) : formatTime(whiteTime)}</Text>
        <Text style={styles.playerLabel}>OPPONENT</Text>
      </View>

      <View style={styles.board}>
        {renderBoard.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {(color === 'b' ? [...row].reverse() : row).map((square, colIndex) => {
               const displayRow = color === 'b' ? rowIndex : 7 - rowIndex;
               const displayCol = color === 'b' ? 7 - colIndex : colIndex;
               const squareName = String.fromCharCode(97 + displayCol) + (displayRow + 1);
              return (
                <Pressable key={colIndex} onPress={() => onSquarePress(squareName as Square)} style={[
                    styles.square,
                    { backgroundColor: (displayRow + displayCol) % 2 === 0 ? '#eeeed2' : '#769656' },
                    squareName === selectedSquare && styles.selectedSquare,
                  ]}>
                  {legalMoves.includes(squareName as Square) && !square && <View style={styles.dot} />}
                  {square && <Image source={pieceImages[square.color + square.type]} style={styles.piece} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.clockContainer}>
        <Text style={styles.playerLabel}>YOU ({color === 'w' ? 'WHITE' : 'BLACK'})</Text>
        <Text style={[styles.timerText, { color: '#769656' }]}>{color === 'w' ? formatTime(whiteTime) : formatTime(blackTime)}</Text>
      </View>
    </View>
  );
}
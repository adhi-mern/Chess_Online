import { Chess, Square } from 'chess.js';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Image, Pressable, Text, View, TouchableOpacity, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ref, onValue, update, onDisconnect } from 'firebase/database';
import { Audio } from 'expo-av';
import styles from '../styles/chess.styles';
import { db } from '../firebaseConfig';
import { useMoveTimer } from './hooks/useMoveTimer';

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
  
  const [gameOver, setGameOver] = useState<{ visible: boolean; msg: string; isWin: boolean }>({
    visible: false, msg: '', isWin: false
  });

  // --- TIMER HOOK ---
  const { moveTimer, resetMoveTimer } = useMoveTimer(
    gameId, 
    color, 
    gameRef.current.turn(), 
    !gameOver.visible
  );

  const moveSound = useRef<Audio.Sound | null>(null);
  const checkSound = useRef<Audio.Sound | null>(null);
  const victorySound = useRef<Audio.Sound | null>(null);

  const playSfx = async (type: 'move' | 'check' | 'victory') => {
    try {
      const s = type === 'move' ? moveSound.current : type === 'check' ? checkSound.current : victorySound.current;
      if (s) { await s.setPositionAsync(0); await s.playAsync(); }
    } catch (e) { console.log("Sound Error", e); }
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
      update(gameDbRef, { fen: gameRef.current.fen(), wTime: parseInt(timeLimit || "300"), bTime: parseInt(timeLimit || "300"), status: 'playing', hostOnline: true });
      onDisconnect(ref(db, `games/${gameId}/hostOnline`)).set(false);
    } else {
      update(gameDbRef, { hasOpponent: true, guestOnline: true });
      onDisconnect(ref(db, `games/${gameId}/guestOnline`)).set(false);
    }

    const unsubscribe = onValue(gameDbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Handle Abandonment (Inactivity)
      if (data.status === 'abandoned_w') triggerEnd(color === 'w' ? "YOU LOSE (Inactive)" : "YOU WIN (Opponent Inactive)");
      if (data.status === 'abandoned_b') triggerEnd(color === 'b' ? "YOU LOSE (Inactive)" : "YOU WIN (Opponent Inactive)");

      // Handle Win/Loss/Timeout
      if (data.status === 'timeout_w') triggerEnd(color === 'w' ? "YOU LOSE (Time Out)" : "YOU WIN (Time Out)");
      if (data.status === 'timeout_b') triggerEnd(color === 'b' ? "YOU LOSE (Time Out)" : "YOU WIN (Time Out)");
      if (data.status?.startsWith('quit_')) {
        const quitter = data.status.split('_')[1];
        triggerEnd(quitter === color ? "YOU LOSE (Resigned)" : "YOU WIN (Opponent Resigned)");
      }
      if (data.hostOnline === false && !gameOver.visible) triggerEnd("YOU WIN (Host Left)");
      if (data.guestOnline === false && !gameOver.visible) triggerEnd("YOU WIN (Opponent Left)");

      // Sync Board
      if (data.fen && data.fen !== gameRef.current.fen()) {
        resetMoveTimer(); // <-- RESET TIMER ON OPPONENT MOVE
        gameRef.current.load(data.fen);
        setBoard(gameRef.current.board());
        setWhiteTime(data.wTime);
        setBlackTime(data.bTime);
        if (gameRef.current.isCheckmate()) playSfx('victory');
        else if (gameRef.current.isCheck()) playSfx('check');
        else playSfx('move');
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
    if (gameOver.visible) return;
    const interval = setInterval(() => {
      const turn = gameRef.current.turn();
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) { handleTimeout('w'); return 0; }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) { handleTimeout('b'); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver.visible]);

  const handleTimeout = (loser: 'w' | 'b') => {
    update(ref(db, `games/${gameId}`), { status: `timeout_${loser}` });
  };

  const triggerEnd = (msg: string) => {
    const isWin = msg.includes("WIN");
    if (isWin) playSfx('victory');
    setGameOver({ visible: true, msg, isWin });
  };

  async function onSquarePress(square: Square) {
    if (gameOver.visible || gameRef.current.turn() !== color) return;

    if (!selectedSquare) {
      const piece = gameRef.current.get(square);
      if (!piece || piece.color !== color) return;
      const moves = gameRef.current.moves({ square, verbose: true });
      setSelectedSquare(square);
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    if (legalMoves.includes(square)) {
      const move = gameRef.current.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        resetMoveTimer(); // <-- RESET TIMER ON YOUR MOVE
        setBoard(gameRef.current.board());
        update(ref(db, `games/${gameId}`), { fen: gameRef.current.fen(), wTime: whiteTime, bTime: blackTime });

        if (gameRef.current.isCheckmate()) {
          playSfx('victory');
          triggerEnd("YOU WIN (Checkmate)");
        } else if (gameRef.current.isCheck()) {
          playSfx('check');
        } else {
          playSfx('move');
        }
      }
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  const kingSquare = useMemo(() => {
    if (!gameRef.current.isCheck()) return null;
    const turn = gameRef.current.turn();
    let pos = "";
    gameRef.current.board().forEach((row, r) => {
      row.forEach((sq, c) => {
        if (sq?.type === 'k' && sq?.color === turn) pos = String.fromCharCode(97 + c) + (8 - r);
      });
    });
    return pos;
  }, [board]);

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;
  const renderBoard = useMemo(() => color === 'b' ? [...board].reverse() : board, [board, color]);

  return (
    <View style={styles.container}>
      <Modal visible={gameOver.visible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, alignItems: 'center', width: '80%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: gameOver.isWin ? '#2ecc71' : '#e74c3c', marginBottom: 20, textAlign: 'center' }}>
              {gameOver.msg}
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 }}
              onPress={() => router.replace('/')}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>MAIN MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View>
          <Text style={styles.gameIdText}>ROOM: {gameId}</Text>
          {/* DISPLAY MOVE TIMER */}
          <Text style={{ color: moveTimer <= 5 ? '#e74c3c' : '#f1c40f', fontWeight: 'bold' }}>
            Move Clock: {moveTimer}s
          </Text>
        </View>
        <TouchableOpacity style={[styles.quitBtn, {backgroundColor: '#e74c3c'}]} onPress={() => {
          update(ref(db, `games/${gameId}`), { status: `quit_${color}` });
          router.replace('/');
        }}>
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
              const dRow = color === 'b' ? rowIndex : 7 - rowIndex;
              const dCol = color === 'b' ? 7 - colIndex : colIndex;
              const sqName = String.fromCharCode(97 + dCol) + (dRow + 1);
              
              const isKingCheck = kingSquare === sqName;
              const isCapture = legalMoves.includes(sqName as Square) && square;

              return (
                <Pressable key={colIndex} onPress={() => onSquarePress(sqName as Square)} style={[
                  styles.square,
                  { backgroundColor: (dRow + dCol) % 2 === 0 ? '#eeeed2' : '#769656' },
                  sqName === selectedSquare && { backgroundColor: '#f5f682' },
                  isKingCheck && { backgroundColor: '#ff4d4d' },
                  isCapture && { borderWidth: 4, borderColor: 'rgba(255, 0, 0, 0.4)' }
                ]}>
                  {legalMoves.includes(sqName as Square) && !square && <View style={styles.dot} />}
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
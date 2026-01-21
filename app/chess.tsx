import { Chess, Square } from 'chess.js';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ref, onValue, set } from 'firebase/database';
import { Audio } from 'expo-av';
import styles from '../styles/chess.styles';
import { db } from '../firebaseConfig';

const game = new Chess();

const pieceImages: Record<string, any> = {
  wp: require('../assets/pieces/white-pawn.png'),
  wr: require('../assets/pieces/white-rook.png'),
  wn: require('../assets/pieces/white-knight.png'),
  wb: require('../assets/pieces/white-bishop.png'),
  wq: require('../assets/pieces/white-queen.png'),
  wk: require('../assets/pieces/white-king.png'),
  bp: require('../assets/pieces/black-pawn.png'),
  br: require('../assets/pieces/black-rook.png'),
  bn: require('../assets/pieces/black-knight.png'),
  bb: require('../assets/pieces/black-bishop.png'),
  bq: require('../assets/pieces/black-queen.png'),
  bk: require('../assets/pieces/black-king.png'),
};

export default function ChessScreen() {
  const { gameId, color } = useLocalSearchParams<{ gameId: string; color: 'w' | 'b' }>();
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  const moveSound = useRef<Audio.Sound | null>(null);
  const checkSound = useRef<Audio.Sound | null>(null);
  const victorySound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!gameId) return;

    // Firebase Listener
    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.fen !== game.fen()) {
        game.load(data.fen);
        setBoard(game.board());
        moveSound.current?.replayAsync();
      }
    });

    // Sound Loader
    async function loadSounds() {
      const { sound: mS } = await Audio.Sound.createAsync(require('../assets/sounds/Move.mp3'));
      moveSound.current = mS;
      const { sound: cS } = await Audio.Sound.createAsync(require('../assets/sounds/Check.mp3'));
      checkSound.current = cS;
      const { sound: vS } = await Audio.Sound.createAsync(require('../assets/sounds/Victory.mp3'));
      victorySound.current = vS;
    }

    loadSounds();

    return () => {
      unsubscribe();
      moveSound.current?.unloadAsync();
      checkSound.current?.unloadAsync();
      victorySound.current?.unloadAsync();
    };
  }, [gameId]);

  async function onSquarePress(square: Square) {
    if (game.turn() !== color) return;

    if (!selectedSquare) {
      const piece = game.get(square);
      if (!piece || piece.color !== color) return;
      const moves = game.moves({ square, verbose: true });
      if (moves.length === 0) return;
      setSelectedSquare(square);
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    if (legalMoves.includes(square)) {
      const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        setBoard(game.board());
        set(ref(db, `games/${gameId}`), { fen: game.fen() });
        await moveSound.current?.replayAsync();
        if (game.isCheckmate()) await victorySound.current?.replayAsync();
        else if (game.isCheck()) await checkSound.current?.replayAsync();
      }
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  const renderBoard = useMemo(() => {
    const currentBoard = [...board];
    return color === 'b' ? currentBoard.reverse() : currentBoard;
  }, [board, color]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game ID: {gameId}</Text>
      <View style={styles.board}>
        {renderBoard.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {(color === 'b' ? [...row].reverse() : row).map((square, colIndex) => {
              const displayRow = color === 'b' ? rowIndex : 7 - rowIndex;
              const displayCol = color === 'b' ? 7 - colIndex : colIndex;
              const squareName = String.fromCharCode(97 + displayCol) + (displayRow + 1);

              return (
                <Pressable
                  key={colIndex}
                  onPress={() => onSquarePress(squareName as Square)}
                  style={[
                    styles.square,
                    { backgroundColor: (displayRow + displayCol) % 2 === 0 ? '#eeeed2' : '#769656' },
                    squareName === selectedSquare && styles.selectedSquare,
                  ]}
                >
                  {legalMoves.includes(squareName as Square) && !square && <View style={styles.dot} />}
                  {square && <Image source={pieceImages[square.color + square.type]} style={styles.piece} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={styles.player}>{game.turn() === color ? "Your Turn" : "Opponent's Turn"}</Text>
    </View>
  );
}
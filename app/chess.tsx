import { Chess, Square } from 'chess.js';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Audio } from 'expo-av';

// npx expo start --go

import styles from '../styles/chess.styles';

const game = new Chess();

/* =======================
   PIECE IMAGE MAP
   ======================= */
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
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  /* =======================
     SOUND REFS
     ======================= */
  const moveSound = useRef<Audio.Sound | null>(null);
  const checkSound = useRef<Audio.Sound | null>(null);
  const victorySound = useRef<Audio.Sound | null>(null);

  /* =======================
     LOAD SOUNDS
     ======================= */
  useEffect(() => {
    async function loadSounds() {
      moveSound.current = (await Audio.Sound.createAsync(
        require('../assets/sounds/Move.mp3')
      )).sound;

      checkSound.current = (await Audio.Sound.createAsync(
        require('../assets/sounds/Check.mp3')
      )).sound;

      victorySound.current = (await Audio.Sound.createAsync(
        require('../assets/sounds/Victory.mp3')
      )).sound;
    }

    loadSounds();

    return () => {
      moveSound.current?.unloadAsync();
      checkSound.current?.unloadAsync();
      victorySound.current?.unloadAsync();
    };
  }, []);

  /* =======================
     MOVE HANDLER
     ======================= */
  async function onSquarePress(square: Square) {
    if (!selectedSquare) {
      const moves = game.moves({ square, verbose: true });
      if (moves.length === 0) return;

      setSelectedSquare(square);
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    if (legalMoves.includes(square)) {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      if (move) {
        // Move or capture → same sound
        await moveSound.current?.replayAsync();

        // Checkmate
        if (game.isCheckmate()) {
          await victorySound.current?.replayAsync();
        }
        // Check
        else if (game.isCheck()) {
          await checkSound.current?.replayAsync();
        }

        setBoard(game.board());
      }
    }

    setSelectedSquare(null);
    setLegalMoves([]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chess Online</Text>
      <Text style={styles.player}>Black</Text>

      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((square, colIndex) => {
              const squareName =
                String.fromCharCode(97 + colIndex) + (8 - rowIndex);

              const isDark = (rowIndex + colIndex) % 2 === 1;
              const isSelected = squareName === selectedSquare;
              const isLegalMove = legalMoves.includes(squareName as Square);

              return (
                <Pressable
                  key={colIndex}
                  onPress={() => onSquarePress(squareName as Square)}
                  style={[
                    styles.square,
                    { backgroundColor: isDark ? '#769656' : '#eeeed2' },
                    isSelected && styles.selectedSquare,
                  ]}
                >
                  {isLegalMove && !square && <View style={styles.dot} />}
                  {isLegalMove && square && <View style={styles.captureRing} />}

                  {square && (
                    <Image
                      source={pieceImages[square.color + square.type]}
                      style={styles.piece}
                      resizeMode="contain"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.player}>White (You)</Text>
    </View>
  );
}

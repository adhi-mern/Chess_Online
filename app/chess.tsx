import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useState } from 'react';
import { Chess } from 'chess.js';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = SCREEN_WIDTH - 24;
const SQUARE_SIZE = BOARD_SIZE / 8;

const game = new Chess();

export default function ChessScreen() {
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  function onSquarePress(square: string) {
    // Select piece
    if (!selectedSquare) {
      const moves = game.moves({ square, verbose: true });
      if (moves.length === 0) return;

      setSelectedSquare(square);
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    // Try move
    if (legalMoves.includes(square)) {
      game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      setBoard(game.board());
    }

    // Clear selection
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
              const isLegalMove = legalMoves.includes(squareName);

              return (
                <Pressable
                  key={colIndex}
                  onPress={() => onSquarePress(squareName)}
                  style={[
                    styles.square,
                    { backgroundColor: isDark ? '#769656' : '#eeeed2' },
                    isSelected && styles.selectedSquare,
                  ]}
                >
                  {/* Legal move dot */}
                  {isLegalMove && !square && <View style={styles.dot} />}

                  {/* Capture indicator */}
                  {isLegalMove && square && (
                    <View style={styles.captureRing} />
                  )}

                  {/* Chess piece */}
                  <Text style={styles.piece}>
                    {square ? pieceToChar(square) : ''}
                  </Text>
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

function pieceToChar(piece: any) {
  const white = {
    p: '♙',
    r: '♖',
    n: '♘',
    b: '♗',
    q: '♕',
    k: '♔',
  };

  const black = {
    p: '♟',
    r: '♜',
    n: '♞',
    b: '♝',
    q: '♛',
    k: '♚',
  };

  return piece.color === 'w'
    ? white[piece.type]
    : black[piece.type];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 8,
  },

  player: {
    color: '#ccc',
    marginVertical: 6,
  },

  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#999',
  },

  row: {
    flexDirection: 'row',
  },

  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedSquare: {
    borderWidth: 3,
    borderColor: '#ff4444',
  },

  piece: {
    fontSize: SQUARE_SIZE * 0.6,
    textAlign: 'center',
  },

  dot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.25,
    height: SQUARE_SIZE * 0.25,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  captureRing: {
    position: 'absolute', 
    width: SQUARE_SIZE * 0.85,
    height: SQUARE_SIZE * 0.85,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.4)',
  },
});

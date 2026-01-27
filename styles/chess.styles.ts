import { Dimensions, StyleSheet } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = SCREEN_WIDTH;
const SQUARE_SIZE = BOARD_SIZE / 8;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // --- NEW HEADER STYLES ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: 20,
    marginTop: 40,
  },
  gameIdText: {
    color: '#769656',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  quitBtn: {
    backgroundColor: '#b33939', // Dark Red
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  // -------------------------
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#444',
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
    backgroundColor: 'rgba(255, 255, 0, 0.4)', // Highlight yellow
    borderWidth: 2,
    borderColor: '#f1c40f',
  },
  piece: {
    width: SQUARE_SIZE * 0.85,
    height: SQUARE_SIZE * 0.85,
  },
  dot: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  clockContainer: {
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
  },
  timerText: {
    fontSize: 26,
    fontFamily: 'monospace',
    color: 'white',
    fontWeight: 'bold',
  },
  playerLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default styles;
import { StyleSheet, Dimensions } from 'react-native';

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
    width: SQUARE_SIZE * 0.8,
    height: SQUARE_SIZE * 0.8,
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

export default styles
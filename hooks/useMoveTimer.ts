import { ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';

export function useMoveTimer(gameId: string, color: 'w' | 'b', turn: 'w' | 'b', isActive: boolean) {
    const [moveTimer, setMoveTimer] = useState(35);

    useEffect(() => {
        // Don't start ticking if the game is over
        if (!isActive) return;

        const interval = setInterval(() => {
            setMoveTimer((prev) => {
                if (prev <= 1) {
                    // If time runs out, tell Firebase the current "turn" player lost
                    update(ref(db, `games/${gameId}`), { status: `abandoned_${turn}` });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [turn, isActive, gameId]); // Re-run this effect whenever the turn changes

    // Function to reset the clock to 15s after a move
    const resetMoveTimer = () => setMoveTimer(35);

    return { moveTimer, resetMoveTimer };
}

export default useMoveTimer;

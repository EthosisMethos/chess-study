import React, { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function TrainerBoard({ moves, playerColor, onComplete, onError }) {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState("start");
  const [moveIndex, setMoveIndex] = useState(0);
  const [history, setHistory] = useState([]); // 👈 store moves made so far

  const sideAt = (i) => (i % 2 === 0 ? "w" : "b");

  // ---------- Initialize board ----------
  useEffect(() => {
    const g = new Chess();
    gameRef.current = g;
    g.reset();

    const playerSide = playerColor === "white" ? "w" : "b";
    let idx = 0;
    while (idx < moves.length && sideAt(idx) !== playerSide) {
      g.move(moves[idx]);
      idx++;
    }

    setMoveIndex(idx);
    setFen(g.fen());
    setHistory(g.history()); // initialize with any pre-played moves
  }, [moves, playerColor]);

  // ---------- Restart ----------
  function restart() {
    const g = new Chess();
    gameRef.current = g;
    g.reset();

    const playerSide = playerColor === "white" ? "w" : "b";
    let idx = 0;
    while (idx < moves.length && sideAt(idx) !== playerSide) {
      g.move(moves[idx]);
      idx++;
    }

    setMoveIndex(idx);
    setFen(g.fen());
    setHistory(g.history());
  }

  // ---------- Helpers ----------
  function normalizeSan(san) {
    return san.replace(/[+#]/g, "").trim().toLowerCase();
  }

  // ---------- Move Handling ----------
  function onDrop(source, target) {
    const g = gameRef.current;
    const move = g.move({ from: source, to: target, promotion: "q" });
    if (!move) return false;

    const expected = moves[moveIndex];
    const actualNorm = normalizeSan(move.san);
    const expectedNorm = normalizeSan(expected);

    if (actualNorm !== expectedNorm) {
      alert(`❌ Wrong move (${move.san}). You should have played: ${expected}`);
      onError?.();
      restart();
      return false;
    }

    // ✅ Correct move
    let i = moveIndex + 1;
    const playerSide = playerColor === "white" ? "w" : "b";
    while (i < moves.length && sideAt(i) !== playerSide) {
      g.move(moves[i]);
      i++;
    }

    setMoveIndex(i);
    setFen(g.fen());
    setHistory(g.history()); // 👈 update move list
    if (i >= moves.length) onComplete?.();
    return true;
  }

  // ---------- Move formatting ----------
  function formatMoveHistory(moves) {
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      const num = i / 2 + 1;
      const white = moves[i] || "";
      const black = moves[i + 1] || "";
      pairs.push(`${num}. ${white} ${black}`.trim());
    }
    return pairs.join(" ");
  }

  // ---------- UI ----------
  return (
    <div>
      <Chessboard
        position={fen}
        boardOrientation={playerColor}
        onPieceDrop={onDrop}
        arePiecesDraggable={true}
        animationDuration={200}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        }}
      />

      {/* Restart button */}
      <div style={{ marginTop: 8 }}>
        <button onClick={restart}>Restart Line</button>
      </div>

      {/* Move history display */}
      <div
        style={{
          marginTop: 16,
          padding: "10px 12px",
          borderRadius: 6,
          background: "#f6f6f6",
          fontFamily: "monospace",
          fontSize: "0.95rem",
          lineHeight: 1.4,
          color: "#333",
          maxHeight: 160,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        <strong>Moves so far:</strong>
        <br />
        {history.length === 0 ? "— (no moves yet)" : formatMoveHistory(history)}
      </div>
    </div>
  );
}

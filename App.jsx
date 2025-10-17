import React, { useState, useRef } from "react";
import TrainerBoard from "./components/TrainerBoard.jsx";

export default function App() {
  const [games, setGames] = useState([]);
  const [current, setCurrent] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(0);
  const fileInputRef = useRef(null);
  const bulkFileRef = useRef(null);

  // ---------- Add new game manually ----------
  function handleAddGame() {
    const raw = prompt("Paste your move list:");
    if (!raw) return;

    const color = prompt("Which side should you play as? (white/black)", "white");
    const playAs = color?.toLowerCase() === "black" ? "black" : "white";

    const movePattern =
      /\b(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)\b/g;
    const moves = raw.match(movePattern);

    if (!moves || moves.length === 0) {
      alert("❌ Could not parse any moves.");
      return;
    }

    const game = {
      id: Date.now(),
      name: `Game ${games.length + 1}`,
      moves,
      color: playAs,
      completedCount: 0,
      errorCount: 0,
    };

    setGames((prev) => [...prev, game]);
    alert(`✅ Added ${game.name} (${playAs})`);
  }

  // ---------- Bulk import text ----------
  function parseBulkText(text) {
    // Split into chunks separated by blank lines
    const blocks = text.trim().split(/\n\s*\n/);
    const imported = [];

    for (const block of blocks) {
      const lines = block.trim().split(/\n/);
      if (lines.length < 2) continue;

      // first line: "Title (white)"
      const header = lines[0].trim();
      const match = header.match(/^(.*)\((white|black)\)$/i);
      if (!match) continue;

      const name = match[1].trim();
      const color = match[2].toLowerCase();

      // rest of block = moves
      const moveText = lines.slice(1).join(" ");
      const movePattern =
        /\b(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)\b/g;
      const moves = moveText.match(movePattern);
      if (!moves || moves.length === 0) continue;

      imported.push({
        id: Date.now() + imported.length,
        name,
        color,
        moves,
        completedCount: 0,
        errorCount: 0,
      });
    }

    return imported;
  }

  function handleBulkImport() {
    const raw = prompt(
      "Paste your bulk openings text here (title + moves separated by blank lines):"
    );
    if (!raw) return;
    const imported = parseBulkText(raw);
    if (imported.length === 0) {
      alert("❌ No valid openings found in text.");
      return;
    }
    setGames((prev) => [...prev, ...imported]);
    alert(`✅ Imported ${imported.length} openings!`);
  }

  function handleBulkFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const imported = parseBulkText(text);
      if (imported.length === 0) {
        alert("❌ No valid openings found in file.");
        return;
      }
      setGames((prev) => [...prev, ...imported]);
      alert(`✅ Imported ${imported.length} openings from file!`);
    };
    reader.readAsText(file);
  }

  // ---------- Weighted shuffle ----------
  function pickWeightedRandom(games) {
    if (games.length === 0) return null;

    const weights = games.map((g) => {
      const completed = g.completedCount ?? 0;
      const errors = g.errorCount ?? 0;
      const completionWeight = 1 / (1 + completed);
      const errorWeight = 1 + errors * 0.2;
      return completionWeight * errorWeight;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;

    let sum = 0;
    for (let i = 0; i < games.length; i++) {
      sum += weights[i];
      if (r <= sum) return games[i];
    }
    return games[games.length - 1];
  }

  function startNextGame() {
    const next = pickWeightedRandom(games);
    if (!next) return alert("No PGNs loaded!");
    setCurrent(next);
    setGameSessionId((prev) => prev + 1);
  }

  // ---------- Mark completion/error ----------
  function handleComplete(gameId) {
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId
          ? { ...g, completedCount: (g.completedCount ?? 0) + 1 }
          : g
      )
    );
    const completed = games.find((g) => g.id === gameId);
    alert(`✅ Completed ${completed?.name || "Opening"}`);
    startNextGame();
  }

  function handleError(gameId) {
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId
          ? { ...g, errorCount: (g.errorCount ?? 0) + 1 }
          : g
      )
    );
  }

  // ---------- Save/load ----------
  function handleSaveLibrary() {
    const dataStr = JSON.stringify(games, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chess_trainer_library.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleLoadLibrary(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target.result);
        if (Array.isArray(loaded)) {
          const repaired = loaded.map((g, i) => ({
            id: g.id ?? Date.now() + i,
            name: g.name ?? `Game ${i + 1}`,
            moves: g.moves ?? [],
            color: g.color ?? "white",
            completedCount: Number(g.completedCount ?? 0),
            errorCount: Number(g.errorCount ?? 0),
          }));
          setGames(repaired);
          alert(`✅ Loaded ${repaired.length} PGNs`);
        } else alert("Invalid file format.");
      } catch {
        alert("Failed to load file.");
      }
    };
    reader.readAsText(file);
  }

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h1>Chess Study Trainer ♟️</h1>
      <p>
        You can now bulk import text files with multiple openings separated by blank lines.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 15 }}>
        <button onClick={handleAddGame}>➕ Add Opening</button>
        <button onClick={handleBulkImport}>📑 Bulk Import Text</button>
        <button onClick={() => bulkFileRef.current.click()}>📂 Import .txt File</button>
        <input
          type="file"
          accept=".txt"
          ref={bulkFileRef}
          style={{ display: "none" }}
          onChange={handleBulkFile}
        />
        <button onClick={startNextGame}>🎲 Start / Shuffle</button>
        <button onClick={handleSaveLibrary}>💾 Save Library</button>
        <button onClick={() => fileInputRef.current.click()}>📂 Load Library</button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleLoadLibrary}
        />
      </div>

      {current ? (
        <TrainerBoard
          key={`${current.id}-${gameSessionId}`}
          moves={current.moves}
          playerColor={current.color}
          onComplete={() => handleComplete(current.id)}
          onError={() => handleError(current.id)}
        />
      ) : (
        <p style={{ color: "#555" }}>Add or import openings, then click Start.</p>
      )}

      {games.length > 0 && (
        <div style={{ marginTop: 25 }}>
          <h3>Loaded Openings ({games.length})</h3>
          <ul>
            {games.map((g) => (
              <li key={g.id}>
                {g.name} ({g.color}) — {g.moves.length} moves — ✅{" "}
                {g.completedCount ?? 0} × completed — ⚠️ {g.errorCount ?? 0} errors
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

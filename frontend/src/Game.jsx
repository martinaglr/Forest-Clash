// src/Game.jsx
import React from "react";
import Card from "./Cards/Card";
import { cards as allCards } from "./Cards/Card";

export default function Game() {
  const [playerTrees, setPlayerTrees] = React.useState(0);
  const [botTrees, setBotTrees] = React.useState(0);
  const [playerBlocked, setPlayerBlocked] = React.useState(false);
  const [botBlocked, setBotBlocked] = React.useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = React.useState(true);
  const [gameOver, setGameOver] = React.useState(false);

  const [playerHand, setPlayerHand] = React.useState([]);
  const [botHand, setBotHand] = React.useState([]);

  const [playerBoard, setPlayerBoard] = React.useState([]);
  const [botBoard, setBotBoard] = React.useState([]);

  // Inicializar manos
  React.useEffect(() => {
    function drawHand() {
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5);
    }
    setPlayerHand(drawHand());
    setBotHand(drawHand());
  }, []);

  function playCard(card, byPlayer = true) {
    if (gameOver) return;

    const setSelfTrees = byPlayer ? setPlayerTrees : setBotTrees;
    const setOpponentTrees = byPlayer ? setBotTrees : setPlayerTrees;

    const selfBlocked = byPlayer ? playerBlocked : botBlocked;
    const setSelfBlocked = byPlayer ? setPlayerBlocked : setBotBlocked;

    const setSelfBoard = byPlayer ? setPlayerBoard : setBotBoard;

    // Quitar carta de la mano
    if (byPlayer) {
      setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    } else {
      setBotHand(prev => prev.filter(c => c.id !== card.id));
    }

    // Efectos de cartas
    switch (card.type) {
      case "tree":
        if (!selfBlocked) {
          setSelfTrees(t => t + 1);
          setSelfBoard(b => [...b, card]);
        }
        break;

      case "politician":
        setSelfBoard(b => [...b, card]);
        byPlayer ? setBotBlocked(true) : setPlayerBlocked(true);
        break;

      case "fire":
        setOpponentTrees(t => Math.max(0, t - 1));
        break;

      case "lumberjack":
        if ((byPlayer ? botTrees : playerTrees) > 0) {
          setSelfTrees(t => t + 1);
          setOpponentTrees(t => t - 1);
        }
        break;

      case "contract":
        setSelfBlocked(false);
        break;

      case "wildfire":
        setOpponentTrees(0);
        break;

      default:
        break;
    }

    // 🔥 FIX IMPORTANTE: evaluar victoria y turnos después de que React procese el estado
    setTimeout(() => {
      const selfTotal =
        byPlayer
          ? playerTrees + (card.type === "tree" ? 1 : 0)
          : botTrees + (card.type === "tree" ? 1 : 0);

      if (selfTotal >= 10) {
        setGameOver(true);
        alert(byPlayer ? "¡Ganaste!" : "¡El bot gana!");
        return;
      }

      setIsPlayerTurn(s => !s);
    }, 50);
  }

  // Turno automático del bot
  React.useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      const timer = setTimeout(() => {
        if (botHand.length === 0) return;
        const botCard = botHand[Math.floor(Math.random() * botHand.length)];
        playCard(botCard, false);
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameOver, botHand]);

  const cardStyle = {
    height: 90,
    width: 70,
    objectFit: "contain",
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    background: "white",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 20 }}>
      <h2>Forest Clash</h2>

      {/* TABLERO DEL BOT */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <h3>Tablero del Bot</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {botBoard.map((c, i) => (
            <img key={i} src={c.img} alt={c.name} style={cardStyle} />
          ))}
        </div>
      </div>

      {/* TABLERO DEL JUGADOR */}
      <div style={{ marginTop: 36, textAlign: "center" }}>
        <h3>Tu Tablero</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {playerBoard.map((c, i) => (
            <img key={i} src={c.img} alt={c.name} style={cardStyle} />
          ))}
        </div>
      </div>

      {/* MANO DEL JUGADOR */}
      {!gameOver && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          {playerHand.map(c => (
            <Card key={c.id} card={c} onPlay={card => playCard(card, true)} />
          ))}
        </div>
      )}
    </div>
  );
}


// src/Game.jsx
import React from "react";
import Card from "./Cards/Card";
import { cards as allCards } from "./Cards/Card";

// BARRA DE PROGRESO
function ProgressBar({ value }) {
  const percent = Math.min(100, (value / 10) * 100);

  let color = "#4caf50";
  if (value >= 8) color = "#e53935";
  else if (value >= 5) color = "#fbc02d";

  return (
    <div style={{ width: "220px", margin: "8px auto" }}>
      <div
        style={{
          height: "12px",
          background: "#ddd",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

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

  // NUEVOS: selección de objetivo para Fogata
  const [selectingBurnTarget, setSelectingBurnTarget] = React.useState(false);
  const [pendingFireCard, setPendingFireCard] = React.useState(null); // carta fogata del jugador esperando target

  // Inicializar manos
  React.useEffect(() => {
    function drawHand() {
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5);
    }
    setPlayerHand(drawHand());
    setBotHand(drawHand());
  }, []);

  // Helper: eliminar carta de board y restar valor
  function removeTreeFromBoard(owner /* 'player'|'bot' */, index) {
    if (owner === "player") {
      const card = playerBoard[index];
      if (!card) return;
      const val = card.value ?? 1;
      setPlayerBoard(prev => prev.filter((_, i) => i !== index));
      setPlayerTrees(t => Math.max(0, t - val));
    } else {
      const card = botBoard[index];
      if (!card) return;
      const val = card.value ?? 1;
      setBotBoard(prev => prev.filter((_, i) => i !== index));
      setBotTrees(t => Math.max(0, t - val));
    }
  }

  function finalizeAfterAction(byPlayer, card) {
    // Comprueba victoria y cambia turno (con pequeño delay para que React aplique todo)
    setTimeout(() => {
      const addedValue = card && card.type === "tree" ? (card.value ?? 1) : 0;
      const selfTotal = byPlayer ? playerTrees + addedValue : botTrees + addedValue;

      if (selfTotal >= 10) {
        setGameOver(true);
        alert(byPlayer ? "¡Ganaste!" : "¡El bot gana!");
        return;
      }

      setIsPlayerTurn(s => !s);
    }, 50);
  }

  function playCard(card, byPlayer = true) {
    if (gameOver) return;

    // Evitar jugar cuando no corresponde al turno
    if (byPlayer && !isPlayerTurn) return;
    if (!byPlayer && isPlayerTurn) return;

    // Si ya estamos en modo selección de Fogata, bloquear jugar otras cartas
    if (selectingBurnTarget && byPlayer) return;

    // Para el bot, si está en modo selección (no debería), ignorar
    if (selectingBurnTarget && !byPlayer) {
      // no debería pasar
      return;
    }

    const setSelfBoard = byPlayer ? setPlayerBoard : setBotBoard;
    const setSelfTrees = byPlayer ? setPlayerTrees : setBotTrees;
    const setOpponentTrees = byPlayer ? setBotTrees : setPlayerTrees;
    const selfBlocked = byPlayer ? playerBlocked : botBlocked;
    const setSelfBlocked = byPlayer ? setPlayerBlocked : setBotBlocked;

    // ======= Manejo especial para Fogata (player) =======
    if (card.type === "fire" && byPlayer) {
      // activar modo selección y guardar la carta pending (NO quitarla de la mano hasta que seleccione objetivo)
      setSelectingBurnTarget(true);
      setPendingFireCard(card);
      return;
    }

    // Quitar carta de la mano (para todos los casos excepto la fogata del jugador, que dejamos hasta confirmar)
    if (byPlayer) {
      setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    } else {
      setBotHand(prev => prev.filter(c => c.id !== card.id));
    }

    // Efectos de cartas
    switch (card.type) {
      case "tree":
        if (!selfBlocked) {
          const treeValue = card.value ?? 1;
          setSelfTrees(t => t + treeValue);
          setSelfBoard(b => [...b, card]);
        }
        break;

      case "politician":
        setSelfBoard(b => [...b, card]);
        byPlayer ? setBotBlocked(true) : setPlayerBlocked(true);
        break;

      case "fire":
        // bot jugó fogata: elegir aleatoriamente un árbol del oponente (si existe)
        if (!byPlayer) {
          if (playerBoard.length > 0) {
            const idx = Math.floor(Math.random() * playerBoard.length);
            const targetCard = playerBoard[idx];
            const val = targetCard.value ?? 1;
            // eliminar del tablero y restar valor
            setPlayerBoard(prev => prev.filter((_, i) => i !== idx));
            setPlayerTrees(t => Math.max(0, t - val));
          } else {
            // si no hay cartas en tablero, como fallback restamos 1 árbol numérico (si hay)
            setPlayerTrees(t => Math.max(0, t - 1));
          }
        }
        break;

      case "lumberjack":
        if ((byPlayer ? botTrees : playerTrees) > 0) {
          setSelfTrees(t => t + 1);
          setOpponentTrees(t => t - 1);
          // opcional: podríamos robar una carta del tablero (no solicitado)
        }
        break;

      case "contract":
        setSelfBlocked(false);
        break;

      case "wildfire":
        // incendió: quema todo el tablero del oponente
        if (byPlayer) {
          // calcular total a restar
          setBotTrees(0);
          setBotBoard([]);
        } else {
          setPlayerTrees(0);
          setPlayerBoard([]);
        }
        break;

      default:
        break;
    }

    // finalizar: comprobar victoria y cambiar turno
    finalizeAfterAction(byPlayer, card);
  }

  // Manejar cuando el jugador está en modo "seleccionar qué árbol quemar"
  function handleBurnTarget(index) {
    if (!selectingBurnTarget || !pendingFireCard) return;
    // objetivo siempre es el tablero del BOT (porque el jugador activó Fogata)
    if (index < 0 || index >= botBoard.length) return;

    // remover carta específica del botBoard y restar su valor
    const cardToBurn = botBoard[index];
    const val = cardToBurn.value ?? 1;
    setBotBoard(prev => prev.filter((_, i) => i !== index));
    setBotTrees(t => Math.max(0, t - val));

    // quitar la fogata de la mano del jugador (pendingFireCard)
    setPlayerHand(prev => prev.filter(c => c.id !== pendingFireCard.id));
    setPendingFireCard(null);
    setSelectingBurnTarget(false);

    // finalizar turno (victoria & toggle)
    finalizeAfterAction(true, pendingFireCard);
  }

  // Turno automático del bot
  React.useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      const timer = setTimeout(() => {
        if (botHand.length === 0) {
          setIsPlayerTurn(true); // si no tiene cartas, pasa el turno
          return;
        }
        const botCard = botHand[Math.floor(Math.random() * botHand.length)];
        playCard(botCard, false);
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameOver, botHand, playerBoard, botBoard]); // dependen también de boards

  // estilos y animación para pulso medio (bordes en selección)
  const cardStyle = {
    height: 90,
    width: 70,
    objectFit: "contain",
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    background: "white",
  };

  const turnIndicatorStyle = {
    position: "absolute",
    top: 10,
    right: 20,
    padding: "8px 14px",
    borderRadius: 20,
    background: isPlayerTurn ? "#4CAF50" : "#F44336",
    color: "white",
    fontWeight: "bold",
    boxShadow: "0 0 8px rgba(0,0,0,0.3)",
  };

  // CSS inyectado para la animación de pulso medio (bordes rojos)
  const pulseCss = `
    @keyframes burnPulse {
      0% { box-shadow: 0 0 0 0 rgba(229,57,53,0.9); }
      50% { box-shadow: 0 0 12px 6px rgba(229,57,53,0.35); }
      100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.0); }
    }
    .burn-target {
      border: 3px solid rgba(229,57,53,0.9);
      border-radius: 8px;
      animation: burnPulse 1.2s infinite;
    }
  `;

  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 20 }}>
      {/* inyectar CSS */}
      <style>{pulseCss}</style>

      <h2>Forest Clash</h2>

      {/* INDICADOR DE TURNO */}
      <div style={turnIndicatorStyle}>
        {isPlayerTurn ? "Tu Turno" : "Turno del Bot"}
      </div>

      {/* PROGRESO DEL BOT */}
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <h3>Árboles del Bot: {botTrees} / 10</h3>
        <ProgressBar value={botTrees} />
      </div>

      {/* TABLERO DEL BOT */}
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <h3>Tablero del Bot</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {botBoard.map((c, i) => {
            const clickable = selectingBurnTarget && pendingFireCard; // solo cuando jugador activó fogata
            return (
              <div
                key={i}
                className={clickable ? "burn-target" : ""}
                onClick={() => {
                  if (clickable) handleBurnTarget(i);
                }}
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <img src={c.img} alt={c.name} style={cardStyle} />
              </div>
            );
          })}
        </div>
      </div>

      {/* PROGRESO DEL JUGADOR */}
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <h3>Tus Árboles: {playerTrees} / 10</h3>
        <ProgressBar value={playerTrees} />
      </div>

      {/* TABLERO DEL JUGADOR */}
      <div style={{ marginTop: 18, textAlign: "center" }}>
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
            pointerEvents: selectingBurnTarget ? "none" : "auto", // evita jugar otras cartas mientras selecciona target
            opacity: selectingBurnTarget ? 0.75 : 1,
          }}
        >
          {playerHand.map(c => (
            <Card
              key={c.id}
              card={c}
              onPlay={card => playCard(card, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

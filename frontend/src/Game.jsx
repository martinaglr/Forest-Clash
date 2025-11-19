// src/Game.jsx
import React from "react";
import Card from "./Cards/Card";
import { cards as allCards } from "./Cards/Card";

// BARRA DE PROGRESO (para objetivo = 20)
function ProgressBar({ value }) {
  // porcentaje respecto de 20
  const percent = Math.min(100, (value / 20) * 100);

  // Colores según rangos proporcionales
  let color = "#4caf50"; // verde
  if (value >= 16) color = "#e53935";      // rojo (80%+)
  else if (value >= 10) color = "#f68222ff"; // amarillo (50%+)
  if (value >= 8) color = "#f0e328ff";
  else if (value >= 5) color = "#1c4524ff";

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

  const [selectingBurnTarget, setSelectingBurnTarget] = React.useState(false);
  const [pendingFireCard, setPendingFireCard] = React.useState(null);

  // Modo selección para el leñador
  const [selectingLumberTarget, setSelectingLumberTarget] = React.useState(false);
  const [pendingLumberCard, setPendingLumberCard] = React.useState(null);

  const [selectingContractTarget, setSelectingContractTarget] = React.useState(false);
  const [pendingContractCard, setPendingContractCard] = React.useState(null);


  // FLAG para evitar múltiples draws por el mismo turno
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = React.useState(false);

  // Inicializar manos al montar
  React.useEffect(() => {
    function drawHand() {
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 4);
    }
    setPlayerHand(drawHand());
    setBotHand(drawHand());
    setHasDrawnThisTurn(false); // listo para primer turno
  }, []);

  // funciones de robar cartas
  function drawCardForPlayer() {
    const newCard = allCards[Math.floor(Math.random() * allCards.length)];
    setPlayerHand(prev => [...prev, newCard]);
  }
  function drawCardForBot() {
    const newCard = allCards[Math.floor(Math.random() * allCards.length)];
    setBotHand(prev => [...prev, newCard]);
  }
  const botPlay = () => {
    if (gameOver) return;

    // si no es el turno del bot, no juega
    if (isPlayerTurn) return;

    const hasPolitician = botBoard.some(card => card.type === "politician");
    const contractCard = botHand.find(card => card.type === "contrato");

    // --- CASO 1: Bot está bloqueado por un político ---
    if (hasPolitician) {

      // NO tiene contrato → pasa turno
      if (!contractCard) {
        console.log("Bot no puede jugar por político → pasa turno");
        setIsPlayerTurn(true);
        setHasDrawnThisTurn(false);
        return;
      }

      // SÍ tiene contrato → usa el contrato automáticamente
      console.log("Bot usa contrato automáticamente");
      playCard(contractCard, false);
      return;
    }

    // --- CASO 2: No tiene político → juega normal ---
    if (botHand.length === 0) {
      setIsPlayerTurn(true);
      setHasDrawnThisTurn(false);
      return;
    }

    const botCard = botHand[Math.floor(Math.random() * botHand.length)];
    playCard(botCard, false);
  };

  // Al comenzar cada turno, robar exactamente UNA carta (player o bot).
  // Usamos hasDrawnThisTurn para que no se ejecute repetidamente.
  React.useEffect(() => {
    if (gameOver) return;

    if (isPlayerTurn) {
      if (!hasDrawnThisTurn) {
        drawCardForPlayer();
        setHasDrawnThisTurn(true);
      }
    } else {
      if (!hasDrawnThisTurn) {
        // bot roba y luego juega (dejamos un pequeño delay para que setBotHand se aplique)
        drawCardForBot();
        setHasDrawnThisTurn(true);

        // programar jugada del bot después de un pequeño retardo (para dejar que el estado de la carta se actualice)
        setTimeout(() => {
          botPlay();
        }, 700);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, gameOver, hasDrawnThisTurn]);

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
  const addedValue = card?.type === "tree" ? (card.value ?? 1) : 0;

  setTimeout(() => {
    // 1) actualizar árboles del jugador o bot
    if (byPlayer) {
      const total = playerTrees + addedValue;
      if (total >= 20) {
        setPlayerTrees(total);
        setGameOver(true);
        alert("¡Ganaste!");
        return;
      }
      setPlayerTrees(total);
      setIsPlayerTurn(false);
      setHasDrawnThisTurn(false);
    } else {
      const total = botTrees + addedValue;
      if (total >= 20) {
        setBotTrees(total);
        setGameOver(true);
        alert("¡El bot gana!");
        return;
      }
      setBotTrees(total);
      setIsPlayerTurn(true);
      setHasDrawnThisTurn(false);
    }
  }, 50);
}



  // jugar carta (player o bot)
  function playCard(card, byPlayer = true) {
    if (gameOver) return;
    if (byPlayer && !isPlayerTurn) return;
    if (!byPlayer && isPlayerTurn) return;

    // si estamos en modo selección de fogata, bloquear jugar otras cartas
    if (selectingBurnTarget && byPlayer) return;

    const setSelfBoard = byPlayer ? setPlayerBoard : setBotBoard;
    const setSelfTrees = byPlayer ? setPlayerTrees : setBotTrees;
    const setOpponentTrees = byPlayer ? setBotTrees : setPlayerTrees;
    const selfBlocked = byPlayer ? playerBlocked : botBlocked;
    const setSelfBlocked = byPlayer ? setPlayerBlocked : setBotBlocked;

    // Manejo especial: Fogata del jugador activa selección (no consumimos la carta aún)
    if (card.type === "fire" && byPlayer) {
      setSelectingBurnTarget(true);
      setPendingFireCard(card);
      return;
    }

    // Consumir carta (removerla de la mano)
    if (byPlayer) {
      setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    } else {
      setBotHand(prev => prev.filter(c => c.id !== card.id));
    }

    // Aplicar efectos según tipo
    switch (card.type) {
      case "tree":
        // si hay político en tu tablero → no puedes plantar
        const hasPolitician = byPlayer
          ? playerBoard.some(c => c.isPolitician)
          : botBoard.some(c => c.isPolitician);

        if (hasPolitician) {
          alert("No puedes plantar árboles mientras haya un Político en tu tablero.");
          return;
        }

        // Plantar árbol normalmente
        const treeValue = card.value ?? 1;
        if (byPlayer) {
          setPlayerBoard(prev => [...prev, { ...card }]); // 👈 Clonamos para renderizar correctamente
          setPlayerTrees(t => t + treeValue);
        } else {
          setBotBoard(prev => [...prev, { ...card }]);
          setBotTrees(t => t + treeValue);
        }

        finalizeAfterAction(byPlayer, card);
        return; // salimos porque ya manejamos el turno


      case "politician":
        // Político siempre se coloca en el tablero del oponente
        if (byPlayer) {
          setBotBoard(b => [...b, { ...card, isPolitician: true }]);
        } else {
          setPlayerBoard(b => [...b, { ...card, isPolitician: true }]);
        }
      break;


      case "fire":
        // fogata jugada por bot: seleccionar árbol del jugador aleatoriamente
        if (!byPlayer) {
          if (playerBoard.length > 0) {
            const idx = Math.floor(Math.random() * playerBoard.length);
            const burned = playerBoard[idx];
            const val = burned.value ?? 1;
            setPlayerBoard(prev => prev.filter((_, i) => i !== idx));
            setPlayerTrees(t => Math.max(0, t - val));
          } else {
            setPlayerTrees(t => Math.max(0, t - 1));
          }
        }
        break;

      case "lumberjack":
        // Si es el jugador → activar modo selección de objetivo
        if (byPlayer) {
          setSelectingLumberTarget(true);
          setPendingLumberCard(card);

          // No sacamos la carta de la mano aún
          return;
        }

        // ---- BOT usando lumbjerjack automática ----

        if (playerBoard.length > 0) {
          const idx = Math.floor(Math.random() * playerBoard.length);
          const stolen = playerBoard[idx];
          const val = stolen.value ?? 1;

          // Quitar del jugador
          setPlayerBoard(prev => prev.filter((_, i) => i !== idx));
          setPlayerTrees(t => Math.max(0, t - val));

          // Agregar al bot
          setBotTrees(t => t + val);
          setBotBoard(b => [...b, stolen]);
        } else {
          // Si no hay árboles para robar: solo gana +1
          setBotTrees(t => t + 1);
          setBotBoard(b => [...b, { type: "tree", value: 1, img: "/img/arbolPeque.png" }]);
        }

        break;

      case "contract":
        // el contrato activa una selección de objetivo político
        setSelectingContractTarget(true);
        setPendingContractCard(card);
        return; // NO finaliza turno todavía


      case "wildfire":
        if (byPlayer) {
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

    // si llegamos aquí, no se plantó un árbol que finalice el turno:
    finalizeAfterAction(byPlayer, card);
  }

  // Cuando el jugador está en modo "seleccionar objetivo de Fogata"
  function handleBurnTarget(index) {
    if (!selectingBurnTarget || !pendingFireCard) return;
    if (index < 0 || index >= botBoard.length) return;

    const cardToBurn = botBoard[index];
    const val = cardToBurn.value ?? 1;

    setBotBoard(prev => prev.filter((_, i) => i !== index));
    setBotTrees(t => Math.max(0, t - val));

    // quitar la fogata de la mano del jugador (solo ahora que objetivo fue elegido)
    setPlayerHand(prev => prev.filter(c => c.id !== pendingFireCard.id));
    setPendingFireCard(null);
    setSelectingBurnTarget(false);

    // finalizar (no fue plantar, así que turno NO debe terminar por eso; pero tu regla dice
    // que fogata no termina el turno — aquí finalizeAfterAction hace toggle, así debemos evitar cambiar turno)
    // Según reglas: fogata NO termina el turno, por lo que NO llamamos finalizeAfterAction con byPlayer=true.
    // En nuestra arquitectura finalizeAfterAction también hace el toggle de turno, por lo que aquí
    // debemos NO llamar a finalizeAfterAction; en vez de eso dejamos que el jugador siga jugando.
    //
    // Por lo tanto NO llamamos a finalizeAfterAction aquí.
    // Si quieres que la fogata también finalice si el jugador lo desea, usa el botón "Terminar Turno".
  }
  
  function handleLumberTarget(index) {
    if (!selectingLumberTarget || !pendingLumberCard) return;
    if (index < 0 || index >= botBoard.length) return;

    const stolenTree = botBoard[index];
    const val = stolenTree.value ?? 1;

    // Quitar del tablero del bot
    setBotBoard(prev => prev.filter((_, i) => i !== index));
    setBotTrees(t => Math.max(0, t - val));

    // Agregar al tablero del jugador
    setPlayerBoard(prev => [...prev, { ...stolenTree }]);
    setPlayerTrees(t => t + val);

    // Consumir carta leñador del jugador
    setPlayerHand(prev => prev.filter(c => c.id !== pendingLumberCard.id));
    setPendingLumberCard(null);
    setSelectingLumberTarget(false);

    // Finalizar turno
    finalizeAfterAction(true, pendingLumberCard);
  }


  function handleContractTarget(index, isBotBoard = true) {
    if (!selectingContractTarget || !pendingContractCard) return;

    const board = isBotBoard ? botBoard : playerBoard;
    const setBoard = isBotBoard ? setBotBoard : setPlayerBoard;

    const selectedCard = board[index];
    if (!selectedCard.isPolitician) return; // solo políticos

    // quitar el político
    setBoard(prev => prev.filter((_, i) => i !== index));

    // quitar la carta contrato de la mano del jugador
    setPlayerHand(prev => prev.filter(c => c.id !== pendingContractCard.id));
    setPendingContractCard(null);
    setSelectingContractTarget(false);

    // finalizar turno
    finalizeAfterAction(true, pendingContractCard);
  }






  // Bot automático: si es su turno y no hay selection en curso, juega.
  // (La jugada del bot se planifica en el effect de draw para asegurar que bot robe primero.)
  React.useEffect(() => {
    // No aquí: la jugada del bot está gestionada por el efecto de turno (arriba), para evitar dobles draws.
    // Dejamos este efecto solo para escuchar condiciones extremas si quieres expandir comportamiento.
  }, [isPlayerTurn, gameOver]);

  // Estilos
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
    top: 30,
    right: 140, // dejar espacio para el botón "Terminar Turno" arriba a la derecha
    padding: "8px 14px",
    borderRadius: 20,
    background: isPlayerTurn ? "#4CAF50" : "#F44336",
    color: "white",
    fontWeight: "bold",
    boxShadow: "0 0 8px rgba(0,0,0,0.3)",
  };

  const endTurnBtnStyle = {
    position: "absolute",
    top: 100,
    right: 120,
    padding: "8px 12px",
    borderRadius: 8,
    background: "#1976d2",
    color: "white",
    fontWeight: "bold",
    border: "none",
    cursor: selectingBurnTarget ? "not-allowed" : "pointer",
    opacity: selectingBurnTarget ? 0.5 : 1,
  };

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
    .fire-target {
      border: 3px solid rgba(255,120,0,0.9);
      border-radius: 8px;
      animation: burnPulse 1s infinite;
    }
    .lumber-target {
      border: 3px solid rgba(0,120,255,0.9);
      border-radius: 8px;
      animation: burnPulse 1s infinite;
    }


  `;

  // Determinar si el jugador tiene alguna carta tree en la mano (para habilitar/mostrar el botón terminar turno)
  const playerHasTreeInHand = playerHand.some(c => c.type === "tree");

  // Manejar "Terminar Turno" (solo jugador)
  function handleEndTurnClick() {
    if (!isPlayerTurn) return;
    if (selectingBurnTarget) return; // no permitir mientras selecciona target
    // Si el jugador tiene árbol disponible, según reglas plantar termina turno; pero si decide no plantar,
    // el botón le permite pasar sin plantar. Llamamos finalizeAfterAction con card = null (no addedValue).
    finalizeAfterAction(true, null);
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 20 }}>
      <style>{pulseCss}</style>

      <h2>Forest Clash</h2>

      {/* Botón Terminar Turno (arriba derecha) */}
      {isPlayerTurn && (
        <button
          style={endTurnBtnStyle}
          onClick={handleEndTurnClick}
          disabled={selectingBurnTarget}
          title={playerHasTreeInHand ? "Puedes plantar un árbol y terminar turno automáticamente" : "Termina tu turno"}
        >
          Terminar Turno
        </button>
      )}

      {/* INDICADOR DE TURNO */}
      <div style={turnIndicatorStyle}>
        {isPlayerTurn ? "Tu Turno" : "Turno del Bot"}
      </div>

      {/* PROGRESO DEL BOT */}
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <h3>Árboles del Bot: {botTrees} / 20</h3>
        <ProgressBar value={botTrees} />
      </div>

      {/* TABLERO DEL BOT */}
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <h3>Tablero del Bot</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {botBoard.map((c, i) => {
            const clickable = selectingBurnTarget || selectingLumberTarget || selectingContractTarget;

            // borde rojo para políticos del rival
            let borderStyle = c.isPolitician ? "3px solid darkred" : "none";

            // si está en modo seleccionar contrato y es político → azul
            if (selectingContractTarget && c.isPolitician) borderStyle = "3px solid blue";

            return (
              <div
                key={i}
                className={
                  selectingBurnTarget
                    ? "fire-target"
                    : selectingLumberTarget
                      ? "lumber-target"
                      : ""
                }
                onClick={() => {
                  if (selectingBurnTarget) handleBurnTarget(i);
                  if (selectingLumberTarget) handleLumberTarget(i);
                  if (selectingContractTarget) handleContractTarget(i, true);
                }}
                style={{
                  cursor: clickable ? "pointer" : "default",
                  border: borderStyle,
                  borderRadius: 8,
                }}
              >
                <img src={c.img} alt={c.name} style={cardStyle} />
              </div>
            );
          })}
        </div>

      </div>


      {/* PROGRESO DEL JUGADOR */}
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <h3>Tus Árboles: {playerTrees} / 20</h3>
        <ProgressBar value={playerTrees} />
      </div>

      {/* TABLERO DEL JUGADOR */}
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <h3>Tu Tablero</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {playerBoard.map((c, i) => {
            const clickable = selectingBurnTarget || selectingLumberTarget || selectingContractTarget;

            // borde rojo para políticos del rival (en este caso, solo si quieres resaltar políticos en tu tablero)
            let borderStyle = c.isPolitician ? "3px solid darkred" : "none";

            // si está en modo seleccionar contrato y es político → azul
            if (selectingContractTarget && c.isPolitician) borderStyle = "3px solid blue";

            // si está en modo fogata y esta carta es objetivo → naranja
            if (selectingBurnTarget && pendingFireCard && c === pendingFireCard.target) {
              borderStyle = "3px solid orange";
            }

            // si está en modo leñador y esta carta es objetivo → verde (ejemplo)
            if (selectingLumberTarget && pendingLumberCard && c === pendingLumberCard.target) {
              borderStyle = "3px solid green";
            }

            return (
              <div
                key={i}
                className={
                  selectingBurnTarget
                    ? "fire-target"
                    : selectingLumberTarget
                      ? "lumber-target"
                      : ""
                }
                style={{
                  cursor: clickable ? "pointer" : "default",
                  border: borderStyle,
                  borderRadius: 8,
                }}
                onClick={() => {
                  if (selectingBurnTarget) handleBurnTarget(i);
                  if (selectingLumberTarget) handleLumberTarget(i);
                  if (selectingContractTarget) handleContractTarget(i, false);
                }}
              >
                <img src={c.img} alt={c.name} style={cardStyle} />
              </div>
            );
          })}



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
            pointerEvents: (selectingBurnTarget || selectingLumberTarget) ? "none" : "auto",
            opacity: (selectingBurnTarget || selectingLumberTarget) ? 0.75 : 1,
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


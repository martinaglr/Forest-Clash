// src/Game.jsx
import React, { useState, useEffect, useCallback } from "react";
import Card from "./Cards/Card";
import { cards as allCards } from "./Cards/Card";
// import subwayVideo from "./Videos/subway_1.mp4";


/* -------------------------
   ProgressBar (sin cambios)
   ------------------------- */
function ProgressBar({ value, goal = 20 }) {
  const percent = Math.min(100, (value / goal) * 100);
  let color = "#4caf50";
  if (value >= goal * 0.9) color = "#e53935";
  else if (value >= goal * 0.5) color = "#fbc02d";
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

/* -------------------------
   Helpers: clonar carta con instanceId
   ------------------------- */
function makeInstance(card) {
  return {
    ...card,
    instanceId: `${card.id}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  };
}

export default function Game() {
  const GOAL = 20; // número de puntos para ganar
  const [playerTrees, setPlayerTrees] = useState(0);
  const [botTrees, setBotTrees] = useState(0);
  const [playerBlocked, setPlayerBlocked] = useState(false);
  const [botBlocked, setBotBlocked] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const [playerHand, setPlayerHand] = useState([]);
  const [botHand, setBotHand] = useState([]);

  const [playerBoard, setPlayerBoard] = useState([]);
  const [botBoard, setBotBoard] = useState([]);

  // Modos de selección
  const [selectingBurnTarget, setSelectingBurnTarget] = useState(false);
  const [pendingFireCard, setPendingFireCard] = useState(null);

  const [selectingLumberTarget, setSelectingLumberTarget] = useState(false);
  const [pendingLumberCard, setPendingLumberCard] = useState(null);

  const [selectingContractTarget, setSelectingContractTarget] = useState(false);
  const [pendingContractCard, setPendingContractCard] = useState(null);

  // control de robos por turno
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [playerHasPolitician, setPlayerHasPolitician] = useState(false);
  const [botHasPolitician, setBotHasPolitician] = useState(false);

  // Historial de jugadas
  const [history, setHistory] = useState([]);

  // Añade entrada al historial (mantiene solo últimas 20)
  function addHistory(byPlayer, label) {
    const entry = {
      player: byPlayer ? "Tú" : "Bot",
      move: label ?? "(acción)",
      time: Date.now(),
    };
    setHistory((prev) => {
      const next = [...prev, entry];
      return next.slice(-20);
    });
  }

  // ------------------------------------------------
  // Inicializar manos (cada carta con instanceId)
  // ------------------------------------------------
  useEffect(() => {
    function drawInitialHand() {
      const deck = [...allCards];
      const shuffled = deck.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5).map((c) => makeInstance(c));
    }
    setPlayerHand(drawInitialHand());
    setBotHand(drawInitialHand());
    setHasDrawnThisTurn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------
  // Draw: solo si mano tiene menos de 5 cartas
  // ------------------------------------------------
  function drawCardForPlayer() {
    setPlayerHand((prev) => {
      if (prev.length >= 5) return prev;
      const c = makeInstance(allCards[Math.floor(Math.random() * allCards.length)]);
      return [...prev, c];
    });
  }
  function drawCardForBot() {
    setBotHand((prev) => {
      if (prev.length >= 5) return prev;
      const c = makeInstance(allCards[Math.floor(Math.random() * allCards.length)]);
      return [...prev, c];
    });
  }

  // ------------------------------------------------
  // finalizeAfterAction: revisar victoria y toggle turno
  // ------------------------------------------------
  function finalizeAfterAction(byPlayer, addedValue = 0) {
    setTimeout(() => {
      if (byPlayer) {
        setPlayerTrees((prev) => {
          const newTotal = prev + addedValue;
          if (newTotal >= GOAL) {
            setGameOver(true);
            setTimeout(() => alert("¡Ganaste!"), 20);
            return newTotal;
          }
          setIsPlayerTurn(false);
          setHasDrawnThisTurn(false);
          return newTotal;
        });
      } else {
        setBotTrees((prev) => {
          const newTotal = prev + addedValue;
          if (newTotal >= GOAL) {
            setGameOver(true);
            setTimeout(() => alert("¡El bot gana!"), 20);
            return newTotal;
          }
          setIsPlayerTurn(true);
          setHasDrawnThisTurn(false);
          return newTotal;
        });
      }
    }, 50);
  }

  // ------------------------------------------------
  // Funcion que el bot usa para decidir/jugar
  // ------------------------------------------------
  const botPlay = useCallback(() => {
    if (gameOver) return;
    if (isPlayerTurn) return;

    const hasPolitician = botBoard.some((card) => card.type === "politician" || card.isPolitician);
    const contractCard = botHand.find((card) => card.type === "contract");

    if (hasPolitician) {
      if (!contractCard) {
        setIsPlayerTurn(true);
        setHasDrawnThisTurn(false);
        return;
      } else {
        const idx = botBoard.findIndex((c) => c.type === "politician" || c.isPolitician);
        if (idx !== -1) {
          // consumir contrato
          setBotHand((prev) => prev.filter((c) => c.instanceId !== contractCard.instanceId));
          const removed = botBoard[idx];
          const val = removed.value ?? 0;
          setBotBoard((prev) => prev.filter((_, i) => i !== idx));
          setBotTrees((t) => Math.max(0, t - val));
          setBotHasPolitician(false);
          addHistory(false, `Contract -> removed Politician`);
          finalizeAfterAction(false, 0);
          return;
        } else {
          setIsPlayerTurn(true);
          setHasDrawnThisTurn(false);
          return;
        }
      }
    }

    const playable = botHand.filter((card) => {
      if (card.type === "tree") return true;
      if (card.type === "wildfire") return true;
      if (card.type === "fire") return playerBoard.length > 0;
      if (card.type === "lumberjack") return playerBoard.length > 0;
      if (card.type === "politician") return true;
      if (card.type === "contract") return true;
      return false;
    });

    if (playable.length === 0) {
      setIsPlayerTurn(true);
      setHasDrawnThisTurn(false);
      return;
    }

    const botCard = playable[Math.floor(Math.random() * playable.length)];
    playCard(botCard, false);
  }, [gameOver, isPlayerTurn, botBoard, botHand, playerBoard]);

  // ------------------------------------------------
  // Turn management
  // ------------------------------------------------
  useEffect(() => {
    if (gameOver) return;

    if (isPlayerTurn) {
      if (!hasDrawnThisTurn) {
        drawCardForPlayer();
        setHasDrawnThisTurn(true);
      }
    } else {
      if (!hasDrawnThisTurn) {
        drawCardForBot();
        setHasDrawnThisTurn(true);
        setTimeout(() => {
          botPlay();
        }, 700);
      }
    }
  }, [isPlayerTurn, gameOver, hasDrawnThisTurn, botPlay]);

  // ------------------------------------------------
  // playCard: remueve por instanceId y maneja modos de seleccion
  // ------------------------------------------------
  function playCard(card, byPlayer = true) {
    if (gameOver) return;
    if (byPlayer && !isPlayerTurn) return;
    if (!byPlayer && isPlayerTurn) return;

    const label = card.name ?? card.type;

    // POLITICIAN
    if (card.type === "politician") {
      if (byPlayer) {
        setBotBoard((prev) => [...prev, { ...card, isPolitician: true }]);
        setBotHasPolitician(true);
        setPlayerHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
        addHistory(true, `Político -> placed on Bot`);
      } else {
        setPlayerBoard((prev) => [...prev, { ...card, isPolitician: true }]);
        setPlayerHasPolitician(true);
        setBotHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
        addHistory(false, `Político -> placed on Player`);
      }
      finalizeAfterAction(byPlayer, 0);
      return;
    }

    // si estamos en modo selección y es el jugador, no permitir otra jugada
    if ((selectingBurnTarget || selectingLumberTarget || selectingContractTarget) && byPlayer) {
      return;
    }

    // FIRE (jugador activa selección; bot ejecuta directamente)
    if (card.type === "fire" && byPlayer) {
      setSelectingBurnTarget(true);
      setPendingFireCard(card);
      // no agregamos al historial hasta confirmar objetivo
      return;
    }

    // LUMBER (jugador activa selección; bot ejecuta directamente)
    if (card.type === "lumberjack" && byPlayer) {
      setSelectingLumberTarget(true);
      setPendingLumberCard(card);
      return;
    }

    // CONTRACT (player selects target politician)
    if (card.type === "contract" && byPlayer) {
      setSelectingContractTarget(true);
      setPendingContractCard(card);
      return;
    }

    // Consumir carta (remover por instanceId)
    if (byPlayer) {
      setPlayerHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else {
      setBotHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    }

    // Ahora aplicar efectos según tipo y añadir historial donde corresponda
    switch (card.type) {
      case "tree": {
        const blocked = byPlayer
          ? playerBoard.some((c) => c.isPolitician)
          : botBoard.some((c) => c.isPolitician);

        if (blocked) {
          alert("No puedes plantar árboles: hay un Politician que lo impide.");
          return;
        }
        addTreeToBoard(card, byPlayer, byPlayer ? setPlayerBoard : setBotBoard);
        addHistory(byPlayer, `Tree (${card.value ?? 1})`);
        finalizeAfterAction(byPlayer, card.value ?? 1);
        return;
      }

      case "fire": {
        if (!byPlayer) {
          // bot jugó fogata -> elegir objetivo en playerBoard si existe
          if (playerBoard.length > 0) {
            const idx = Math.floor(Math.random() * playerBoard.length);
            const burned = playerBoard[idx];
            const val = burned.value ?? 1;
            setPlayerBoard((prev) => prev.filter((_, i) => i !== idx));
            setPlayerTrees((t) => Math.max(0, t - val));
            addHistory(false, `Fogata -> burned ${burned.name ?? "tree"}`);
          } else {
            setPlayerTrees((t) => Math.max(0, t - 1));
            addHistory(false, `Fogata -> -1 trees`);
          }
        }
        break;
      }

      case "lumberjack": {
        if (!byPlayer) {
          if (playerBoard.length > 0) {
            const idx = Math.floor(Math.random() * playerBoard.length);
            const stolen = playerBoard[idx];
            const val = stolen.value ?? 1;
            setPlayerBoard((prev) => prev.filter((_, i) => i !== idx));
            setPlayerTrees((t) => Math.max(0, t - val));
            setBotBoard((b) => [...b, stolen]);
            setBotTrees((t) => t + val);
            addHistory(false, `Leñador -> stole ${stolen.name ?? "tree"}`);
          } else {
            const treeTemplate = allCards.find((x) => x.type === "tree");
            setBotBoard((b) => [...b, makeInstance(treeTemplate)]);
            setBotTrees((t) => t + 1);
            addHistory(false, `Leñador -> +1 tree`);
          }
        }
        break;
      }

      case "contract": {
        if (!byPlayer) {
          const idxSelf = botBoard.findIndex((c) => c.type === "politician" || c.isPolitician);
          if (idxSelf !== -1) {
            const removed = botBoard[idxSelf];
            const val = removed.value ?? 0;
            setBotBoard((prev) => prev.filter((_, i) => i !== idxSelf));
            setBotTrees((t) => Math.max(0, t - val));
            setBotHasPolitician(false);
            addHistory(false, `Contract -> removed own Politician`);
          } else {
            const idxOpp = playerBoard.findIndex((c) => c.type === "politician" || c.isPolitician);
            if (idxOpp !== -1) {
              const removed = playerBoard[idxOpp];
              const val = removed.value ?? 0;
              setPlayerBoard((prev) => prev.filter((_, i) => i !== idxOpp));
              setPlayerTrees((t) => Math.max(0, t - val));
              setPlayerHasPolitician(false);
              addHistory(false, `Contract -> removed player's Politician`);
            }
          }
        }
        break;
      }

      case "wildfire": {
        if (byPlayer) {
          setBotBoard([]);
          setBotTrees(0);
          setBotHasPolitician(false);
          addHistory(true, `Wildfire -> wiped Bot`);
        } else {
          setPlayerBoard([]);
          setPlayerTrees(0);
          setPlayerHasPolitician(false);
          addHistory(false, `Wildfire -> wiped Player`);
        }
        break;
      }

      default:
        break;
    }

    // finalizar turno si corresponde (tree ya finalizó dentro del case)
    finalizeAfterAction(byPlayer, card.type === "tree" ? (card.value ?? 1) : 0);
  }

  // ------------------------------------------------
  // Manejar selección de objetivo para Fogata (jugador selecciona un árbol del bot)
  // ------------------------------------------------
  function handleBurnTarget(index) {
    if (!selectingBurnTarget || !pendingFireCard) return;
    if (index < 0 || index >= botBoard.length) return;

    const cardToBurn = botBoard[index];
    const val = cardToBurn.value ?? 1;
    setBotBoard((prev) => prev.filter((_, i) => i !== index));
    setBotTrees((t) => Math.max(0, t - val));

    // consumir la fogata (por instanceId)
    setPlayerHand((prev) => prev.filter((c) => c.instanceId !== pendingFireCard.instanceId));
    addHistory(true, `Fogata -> burned ${cardToBurn.name ?? "tree"}`);
    setPendingFireCard(null);
    setSelectingBurnTarget(false);

    // fogata no termina el turno por regla
  }

  // ------------------------------------------------
  // Manejar selección de objetivo para Leñador (jugador)
  // ------------------------------------------------
  function handleLumberTarget(index) {
    if (!selectingLumberTarget || !pendingLumberCard) return;
    if (index < 0 || index >= botBoard.length) return;

    const stolen = botBoard[index];
    const val = stolen.value ?? 1;

    // quitar del bot
    setBotBoard((prev) => prev.filter((_, i) => i !== index));
    setBotTrees((t) => Math.max(0, t - val));

    // agregar al jugador (la carta robada debe conservar imagen/valor; le asignamos nueva instanceId)
    const newInstance = makeInstance({ ...stolen, id: stolen.id });
    setPlayerBoard((prev) => [...prev, newInstance]);
    setPlayerTrees((t) => t + val);

    // consumir la carta leñador de la mano del jugador
    setPlayerHand((prev) => prev.filter((c) => c.instanceId !== pendingLumberCard.instanceId));
    addHistory(true, `Leñador -> stole ${stolen.name ?? "tree"}`);
    setPendingLumberCard(null);
    setSelectingLumberTarget(false);

    // leñador NO termina el turno por regla
  }

  // ------------------------------------------------
  // Manejar selección de objetivo para Contract (jugador)
  // ------------------------------------------------
  function handleContractTarget(index, targetIsBot = true) {
    if (!selectingContractTarget || !pendingContractCard) return;
    const board = targetIsBot ? botBoard : playerBoard;
    if (index < 0 || index >= board.length) return;
    const candidate = board[index];
    if (!(candidate.type === "politician" || candidate.isPolitician)) return;

    if (targetIsBot) {
      const val = candidate.value ?? 0;
      setBotBoard((prev) => prev.filter((_, i) => i !== index));
      setBotTrees((t) => Math.max(0, t - val));
      setBotHasPolitician(false);
      addHistory(true, `Contract -> removed Bot Politician`);
    } else {
      const val = candidate.value ?? 0;
      setPlayerBoard((prev) => prev.filter((_, i) => i !== index));
      setPlayerTrees((t) => Math.max(0, t - val));
      setPlayerHasPolitician(false);
      addHistory(true, `Contract -> removed Your Politician`);
    }

    // consumir contract de la mano del jugador
    setPlayerHand((prev) => prev.filter((c) => c.instanceId !== pendingContractCard.instanceId));
    setPendingContractCard(null);
    setSelectingContractTarget(false);
  }

  function addTreeToBoard(card, byPlayer, setSelfBoard /*, setSelfTrees no se usa */) {
    const instance = makeInstance(card);
    setSelfBoard((prev) => [...prev, instance]);
  }

  // ------------------------------------------------
  // Estilos y render
  // ------------------------------------------------
  const pulseCss = `
    @keyframes burnPulse {
      0% { box-shadow: 0 0 0 0 rgba(229,57,53,0.9); }
      50% { box-shadow: 0 0 12px 6px rgba(229,57,53,0.35); }
      100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.0); }
    }
    .fire-target {
      border: 3px solid rgba(229,57,53,0.9);
      border-radius: 8px;
      animation: burnPulse 1.2s infinite;
    }
    .lumber-target {
      border: 3px solid rgba(39,174,96,0.95);
      border-radius: 8px;
      animation: burnPulse 1.2s infinite;
    }
    .contract-target {
      border: 3px solid rgba(66,133,244,0.95);
      border-radius: 8px;
      animation: burnPulse 1.2s infinite;
    }
    .politician-red {
      border: 3px solid darkred;
      border-radius: 8px;
    }
  `;

  const isPolitician = (c) => c.type === "politician" || c.isPolitician;
  const playerHasTreeInHand = playerHand.some((c) => c.type === "tree");

  function handleEndTurnClick() {
    if (!isPlayerTurn) return;
    if (selectingBurnTarget || selectingLumberTarget || selectingContractTarget) return;
    finalizeAfterAction(true, 0);
  }

  const cardStyle = {
    width: "80px",
    height: "110px",
    borderRadius: "8px",
    boxShadow: "0 0 6px rgba(0,0,0,0.25)",
  };

  function handlePlayerCardClick(card) {
    playCard(card, true);
  }

  return (
      <>
        {/*
        <video
          src={subwayVideo}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "fixed",
            bottom: "30px",
            right: "20px",
            width: "180px",
            height: "400px",
            objectFit: "cover",   // ← IMPORTANTE
            borderRadius: "12px",
            boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
            zIndex: 20,
          }}
        />
        */}

      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          padding: 20,
          marginLeft: "260px",
        }}
      >
        {/* Panel de Reglas */}
        <div
          style={{
            position: "absolute",
            left: -200,
            top: 100,
            width: "300px",
            height: "70%",
            background: "#f2f2f2",
            padding: "16px",
            borderRight: "3px solid #ccc",
            overflowY: "auto",
            boxShadow: "2px 0 6px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ color: "#917b00ff" }}>Reglas</h3>

          <p>
            <strong>Objetivo:</strong> Llegar a 20 puntos plantando árboles.
          </p>

          <h4>Cartas</h4>
          <ul>
            <li>
              <strong>Árbol:</strong> Suma su valor a tu puntaje.
            </li>
            <li>
              <strong>Fogata:</strong> Quita 1 carta del tablero enemigo.
            </li>
            <li>
              <strong>Incendio:</strong> Quita 2 cartas del tablero enemigo.
            </li>
            <li>
              <strong>Leñador:</strong> Elimina un árbol del enemigo.
            </li>
            <li>
              <strong>Político:</strong> Bloquea al rival para plantar árboles.
            </li>
            <li>
              <strong>Contrato:</strong> Elimina el Político que te bloquea.
            </li>
          </ul>

          <h4>Turnos</h4>
          <ul>
            <li>Se roba 1 carta por turno (máx 5 en mano).</li>
            <li>Puedes jugar 1 carta por turno.</li>
            <li>Si el bot no puede jugar, pasa turno.</li>
          </ul>
        </div>

        {/* Animación CSS pulse */}
        <style>{pulseCss}</style>

        <h2>Forest Clash</h2>

        {/* indicador de turno y botón terminar turno */}
        <div style={{ position: "absolute", top: 10, right: 20 }}>
          <div
            style={{
              marginBottom: 8,
              background: isPlayerTurn ? "#4CAF50" : "#F44336",
              color: "white",
              padding: "6px 10px",
              borderRadius: 16,
            }}
          >
            {isPlayerTurn ? "Tu Turno" : "Turno del Bot"}
          </div>

          {isPlayerTurn && (
            <button
              onClick={handleEndTurnClick}
              disabled={
                selectingBurnTarget || selectingLumberTarget || selectingContractTarget
              }
            >
              Terminar Turno
            </button>
          )}
        </div>

        {/* progreso del bot */}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <h3>
            Árboles del Bot: {botTrees} / {GOAL}
          </h3>
          <ProgressBar value={botTrees} goal={GOAL} />
        </div>

        {/* tablero del bot */}
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <h3>Tablero del Bot</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {botBoard.map((c, i) => {
              let cls = "";
              if (selectingBurnTarget) cls = "fire-target";
              else if (selectingLumberTarget) cls = "lumber-target";
              else if (selectingContractTarget && isPolitician(c)) cls = "contract-target";

              const extraStyle = isPolitician(c)
                ? { border: "3px solid darkred", borderRadius: 8 }
                : {};

              return (
                <div
                  key={c.instanceId}
                  className={cls + (isPolitician(c) ? " politician-red" : "")}
                  onClick={() => {
                    if (selectingBurnTarget) handleBurnTarget(i);
                    if (selectingLumberTarget) handleLumberTarget(i);
                    if (selectingContractTarget) handleContractTarget(i, true);
                  }}
                  style={{
                    cursor:
                      selectingBurnTarget || selectingLumberTarget || selectingContractTarget
                        ? "pointer"
                        : "default",
                    ...extraStyle,
                  }}
                >
                  <img src={c.img} alt={c.name} style={cardStyle} />
                </div>
              );
            })}
          </div>
        </div>

        {/* progreso del jugador */}
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <h3>
            Tus Árboles: {playerTrees} / {GOAL}
          </h3>
          <ProgressBar value={playerTrees} goal={GOAL} />
        </div>

        {/* Tablero del jugador */}
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <h3>Tu Tablero</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {playerBoard.map((c, i) => {
              let cls = "";
              if (selectingBurnTarget) cls = "fire-target";
              else if (selectingLumberTarget) cls = "lumber-target";

              const extraStyle = isPolitician(c)
                ? { border: "3px solid darkred", borderRadius: 8 }
                : {};

              return (
                <div
                  key={c.instanceId}
                  className={cls}
                  onClick={() => {
                    if (selectingBurnTarget) handleBurnTarget(i, true);
                    if (selectingLumberTarget) handleLumberTarget(i, true);
                  }}
                  style={{ ...extraStyle }}
                >
                  <img src={c.img} alt={c.name} style={cardStyle} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Mano del jugador */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <h3>Tu Mano</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {playerHand.map((c) => (
              <div
                key={c.instanceId}
                className={
                  selectingBurnTarget || selectingLumberTarget || selectingContractTarget
                    ? "disabled-card"
                    : "hand-card"
                }
                onClick={() =>
                  !selectingBurnTarget &&
                  !selectingLumberTarget &&
                  !selectingContractTarget &&
                  handlePlayerCardClick(c)
                }
              >
                <img src={c.img} alt={c.name} style={cardStyle} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel de Jugadas - derecha */}
      <div
        style={{
          position: "absolute",
          right: "10px",
          top: "100px",
          width: "210px",
          background: "#ffffffcc",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 0 8px rgba(0,0,0,0.15)",
          fontSize: "14px",
        }}
      >
        <h4 style={{ marginTop: 0, color: "#444", textAlign: "center" }}>Jugadas</h4>

        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 12 }}>Jugador</th>
                <th style={{ textAlign: "right", fontSize: 12 }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", paddingTop: 8, color: "#666" }}>
                    Aún no hay jugadas
                  </td>
                </tr>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <tr key={i} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      <td style={{ padding: "6px 4px" }}>{h.player}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right" }}>{h.move}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}



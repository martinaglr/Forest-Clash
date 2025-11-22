// src/Game.jsx
import React from "react";
import Card from "./Cards/Card";
import { cards as allCards } from "./Cards/Card";

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
  // instanceId simple y suficientemente único para este juego
  return { ...card, instanceId: `${card.id}-${Date.now()}-${Math.floor(Math.random() * 1e6)}` };
}

export default function Game() {
  const GOAL = 20; // número de puntos para ganar (cambialo si quieres)
  const [playerTrees, setPlayerTrees] = React.useState(0);
  const [botTrees, setBotTrees] = React.useState(0);
  const [playerBlocked, setPlayerBlocked] = React.useState(false);
  const [botBlocked, setBotBlocked] = React.useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = React.useState(true);
  const [gameOver, setGameOver] = React.useState(false);

  const [playerHand, setPlayerHand] = React.useState([]);
  const [botHand, setBotHand] = React.useState([]);

  // Guardamos cartas enteras (con instanceId) en el tablero
  const [playerBoard, setPlayerBoard] = React.useState([]);
  const [botBoard, setBotBoard] = React.useState([]);

  // Modos de selección
  const [selectingBurnTarget, setSelectingBurnTarget] = React.useState(false);
  const [pendingFireCard, setPendingFireCard] = React.useState(null);

  const [selectingLumberTarget, setSelectingLumberTarget] = React.useState(false);
  const [pendingLumberCard, setPendingLumberCard] = React.useState(null);

  const [selectingContractTarget, setSelectingContractTarget] = React.useState(false);
  const [pendingContractCard, setPendingContractCard] = React.useState(null);

  // para controlar robos por turno
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = React.useState(false);
  const [playerHasPolitician, setPlayerHasPolitician] = React.useState(false);
  const [botHasPolitician, setBotHasPolitician] = React.useState(false);

  // ------------------------------------------------
  // Inicializar manos (cada carta con instanceId)
  // ------------------------------------------------
  React.useEffect(() => {
    function drawInitialHand() {
      const deck = [...allCards];
      // mezclar y tomar 5 instancias
      const shuffled = deck.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5).map(c => makeInstance(c));
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
    setPlayerHand(prev => {
      if (prev.length >= 5) return prev; // NO robar si ya hay 5
      const c = makeInstance(allCards[Math.floor(Math.random() * allCards.length)]);
      return [...prev, c];
    });
  }
  function drawCardForBot() {
    setBotHand(prev => {
      if (prev.length >= 5) return prev; // no robar si ya tiene 5
      const c = makeInstance(allCards[Math.floor(Math.random() * allCards.length)]);
      return [...prev, c];
    });
  }

  // ------------------------------------------------
  // finalizeAfterAction: revisar victoria y toggle turno
  // ------------------------------------------------
  function finalizeAfterAction(byPlayer, addedValue = 0) {
    // small delay para que React aplique los estados previos
    setTimeout(() => {
      if (byPlayer) {
        setPlayerTrees(prev => {
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
        setBotTrees(prev => {
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
  // Funcion que el bot usa para decidir/jugar (mejor control)
  // ------------------------------------------------
  const botPlay = React.useCallback(() => {
    if (gameOver) return;
    if (isPlayerTurn) return; // solo jugar si es su turno

    // Si hay Politician en su tablero detectarlo por la propiedad que pusimos (isPolitician o type)
    const hasPolitician = botBoard.some(card => card.type === "politician" || card.isPolitician);
    const contractCard = botHand.find(card => card.type === "contract");

    // Si está bloqueado por político
    if (hasPolitician) {
      if (!contractCard) {
        // no tiene contrato -> pasar
        setIsPlayerTurn(true);
        setHasDrawnThisTurn(false);
        return;
      } else {
        // usar contrato automáticamente: elegir un politician en su tablero y removerlo
        const idx = botBoard.findIndex(c => c.type === "politician" || c.isPolitician);
        if (idx !== -1) {
          // primero consumir contrato (remover instancia específica)
          setBotHand(prev => prev.filter(c => c.instanceId !== contractCard.instanceId));
          // sacar politician seleccionado
          const removed = botBoard[idx];
          const val = removed.value ?? 0;
          setBotBoard(prev => prev.filter((_, i) => i !== idx));
          setBotTrees(t => Math.max(0, t - val));
          // además actualizar flag
          setBotHasPolitician(false);
          // finalizar acción (contract no añade árboles)
          finalizeAfterAction(false, 0);
          return;
        } else {
          // por seguridad, pasar turno
          setIsPlayerTurn(true);
          setHasDrawnThisTurn(false);
          return;
        }
      }
    }

    // Si no está bloqueado -> elegir carta jugable.
    // Filtramos cartas que el bot puede jugar en solitario (sin selección manual)
    const playable = botHand.filter(card => {
      if (card.type === "tree") return true;
      if (card.type === "wildfire") return true;
      if (card.type === "fire") return playerBoard.length > 0; // fogata necesita objetivo en playerBoard, si no -> no jugar
      if (card.type === "lumberjack") return playerBoard.length > 0; // leñador necesita objetivo
      if (card.type === "politician") return true; // puede poner politician en tu tablero
      if (card.type === "contract") return true; // puede usar para liberarse si necesario (aunque no necesario ahora)
      return false;
    });

    if (playable.length === 0) {
      // si no tiene nada util -> pasar
      setIsPlayerTurn(true);
      setHasDrawnThisTurn(false);
      return;
    }

    // Priorizar: si puede ganar con tree -> jugar tree alto, si incendiar todo le conviene etc.
    // Por ahora: elegimos aleatorio entre jugables
    const botCard = playable[Math.floor(Math.random() * playable.length)];
    playCard(botCard, false);
    // playCard llamará finalizeAfterAction cuando corresponda
  }, [gameOver, isPlayerTurn, botBoard, botHand, playerBoard]);

  // ------------------------------------------------
  // Turn management: al comienzo de cada turno robar una carta si mano < 5
  // ------------------------------------------------
  React.useEffect(() => {
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

        // programar botPlay con delay (pero botPlay revisa condiciones actuales)
        setTimeout(() => {
          botPlay();
        }, 700);
      }
    }
  }, [isPlayerTurn, gameOver, hasDrawnThisTurn, botPlay]);

  // ------------------------------------------------
  // playCard: ahora REMUEVE por instanceId y maneja modos de seleccion
  // ------------------------------------------------
  function playCard(card, byPlayer = true) {
    if (gameOver) return;
    if (byPlayer && !isPlayerTurn) return;
    if (!byPlayer && isPlayerTurn) return;

    // POLITICIAN: colocarlo en tablero del rival y marcar flag
    if (card.type === "politician") {
      if (byPlayer) {
        // jugador → coloca politician en el BOT
        setBotBoard(prev => [...prev, { ...card, isPolitician: true }]);
        setBotHasPolitician(true);
      } else {
        // bot → coloca politician en el JUGADOR
        setPlayerBoard(prev => [...prev, { ...card, isPolitician: true }]);
        setPlayerHasPolitician(true);
      }

      // remover carta de la mano por instanceId
      if (byPlayer) {
        setPlayerHand(prev => prev.filter(c => c.instanceId !== card.instanceId));
      } else {
        setBotHand(prev => prev.filter(c => c.instanceId !== card.instanceId));
      }

      // político NO suma árboles → finaliza el turno sin sumar
      finalizeAfterAction(byPlayer, 0);
      return;
    }

    // si estamos en modo selección de fogata/lenador/contrato y es el jugador -> bloquear otras cartas (salvo la correspondiente)
    if ((selectingBurnTarget || selectingLumberTarget || selectingContractTarget) && byPlayer) {
      // si estamos seleccionando, solo la acción de seleccionar target debería continuar, no permitir jugar otra carta
      return;
    }

    // Si es fogata y jugador: activar selección (no consumir la carta hasta confirmar target)
    if (card.type === "fire" && byPlayer) {
      setSelectingBurnTarget(true);
      setPendingFireCard(card);
      return;
    }

    // Si es leñador y jugador: activar selección (no consumir la carta hasta confirmar)
    if (card.type === "lumberjack" && byPlayer) {
      setSelectingLumberTarget(true);
      setPendingLumberCard(card);
      return;
    }

    // Si es contract y jugador: activar selección (apuntar a un politician en tu tablero para liberar)
    if (card.type === "contract" && byPlayer) {
      setSelectingContractTarget(true);
      setPendingContractCard(card);
      return;
    }

    // Consumir carta (remover por instanceId)
    if (byPlayer) {
      setPlayerHand(prev => prev.filter(c => c.instanceId !== card.instanceId));
    } else {
      setBotHand(prev => prev.filter(c => c.instanceId !== card.instanceId));
    }

    const setSelfBoard = byPlayer ? setPlayerBoard : setBotBoard;
    const setOpponentBoard = byPlayer ? setBotBoard : setPlayerBoard;
    const setSelfTrees = byPlayer ? setPlayerTrees : setBotTrees;
    const setOpponentTrees = byPlayer ? setBotTrees : setPlayerTrees;

    // Aplicar efectos
    switch (card.type) {
      case "tree": {
        const blocked = byPlayer
          ? playerBoard.some(c => c.isPolitician)
          : botBoard.some(c => c.isPolitician);

        if (blocked) {
          alert("No puedes plantar árboles: hay un Politician que lo impide.");
          return;
        }

        // añadir al tablero (la función NO suma)
        addTreeToBoard(card, byPlayer, setSelfBoard);

        // FINAL: finalizeAfterAction suma el valor y alterna turno
        finalizeAfterAction(byPlayer, card.value ?? 1);
        return;
      }

      case "fire": {
        // si bot jugó fogata (por bot no activamos modo de selección)
        if (!byPlayer) {
          if (playerBoard.length > 0) {
            // elegir índice aleatorio del jugador
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
      }

      case "lumberjack": {
        // si bot jugó leñador (no selección)
        if (!byPlayer) {
          if (playerBoard.length > 0) {
            const idx = Math.floor(Math.random() * playerBoard.length);
            const stolen = playerBoard[idx];
            const val = stolen.value ?? 1;
            // remover del jugador
            setPlayerBoard(prev => prev.filter((_, i) => i !== idx));
            setPlayerTrees(t => Math.max(0, t - val));
            // agregar al bot
            setBotBoard(b => [...b, stolen]);
            setBotTrees(t => t + val);
          } else {
            // si no hay, suma 1 al bot (representa leñador plantando)
            const treeTemplate = allCards.find(x => x.type === "tree");
            setBotBoard(b => [...b, makeInstance(treeTemplate)]);
            setBotTrees(t => t + 1);
          }
        }
        break;
      }

      case "contract": {
        // si el contrato fue jugado "directamente" (bot), intentamos eliminar un politician del bot o del rival
        if (!byPlayer) {
          // bot usará contract sobre su propio tablero si tiene politician, sino sobre jugador si hay politician
          const idxSelf = botBoard.findIndex(c => c.type === "politician" || c.isPolitician);
          if (idxSelf !== -1) {
            const removed = botBoard[idxSelf];
            const val = removed.value ?? 0;
            setBotBoard(prev => prev.filter((_, i) => i !== idxSelf));
            setBotTrees(t => Math.max(0, t - val));
            setBotHasPolitician(false);
          } else {
            const idxOpp = playerBoard.findIndex(c => c.type === "politician" || c.isPolitician);
            if (idxOpp !== -1) {
              const removed = playerBoard[idxOpp];
              const val = removed.value ?? 0;
              setPlayerBoard(prev => prev.filter((_, i) => i !== idxOpp));
              setPlayerTrees(t => Math.max(0, t - val));
              setPlayerHasPolitician(false);
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
        } else {
          setPlayerBoard([]);
          setPlayerTrees(0);
          setPlayerHasPolitician(false);
        }
        break;
      }

      default:
        break;
    }

    // si no fue plantación que finalice el turno (por ejemplo fogata, politician, leñador automático, contract automático)
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
    setBotBoard(prev => prev.filter((_, i) => i !== index));
    setBotTrees(t => Math.max(0, t - val));

    // consumir la fogata (por instanceId)
    setPlayerHand(prev => prev.filter(c => c.instanceId !== pendingFireCard.instanceId));
    setPendingFireCard(null);
    setSelectingBurnTarget(false);

    // fogata no termina el turno por regla — permitimos seguir jugando,
    // el jugador debe terminar turno manualmente si lo desea (botón Terminar Turno).
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
    setBotBoard(prev => prev.filter((_, i) => i !== index));
    setBotTrees(t => Math.max(0, t - val));

    // agregar al jugador (la carta robada debe conservar imagen/valor; le asignamos nueva instanceId)
    const newInstance = makeInstance({ ...stolen, id: stolen.id });
    setPlayerBoard(prev => [...prev, newInstance]);
    setPlayerTrees(t => t + val);

    // consumir la carta leñador de la mano del jugador
    setPlayerHand(prev => prev.filter(c => c.instanceId !== pendingLumberCard.instanceId));
    setPendingLumberCard(null);
    setSelectingLumberTarget(false);

    // leñador NO termina el turno por regla; el jugador sigue pudiendo jugar
  }

  // ------------------------------------------------
  // Manejar selección de objetivo para Contract (jugador)
  // Al seleccionar un politician en el tablero del bot, lo removemos y consumimos el contract
  // ------------------------------------------------
  function handleContractTarget(index, targetIsBot = true) {
    if (!selectingContractTarget || !pendingContractCard) return;
    const board = targetIsBot ? botBoard : playerBoard;
    if (index < 0 || index >= board.length) return;
    const candidate = board[index];
    if (!(candidate.type === "politician" || candidate.isPolitician)) return; // solo politicians

    // remove politician from board
    if (targetIsBot) {
      const val = candidate.value ?? 0;
      setBotBoard(prev => prev.filter((_, i) => i !== index));
      setBotTrees(t => Math.max(0, t - val));
      setBotHasPolitician(false);
    } else {
      const val = candidate.value ?? 0;
      setPlayerBoard(prev => prev.filter((_, i) => i !== index));
      setPlayerTrees(t => Math.max(0, t - val));
      setPlayerHasPolitician(false);
    }

    // consumir el contract de la mano del jugador (por instanceId)
    setPlayerHand(prev => prev.filter(c => c.instanceId !== pendingContractCard.instanceId));
    setPendingContractCard(null);
    setSelectingContractTarget(false);

    // contract NO da árboles; jugador sigue jugando (por tus reglas)
  }

  function addTreeToBoard(card, byPlayer, setSelfBoard /*, setSelfTrees no se usa */) {
    // usamos makeInstance para que cada carta en el tablero tenga instanceId propio
    const instance = makeInstance(card);
    setSelfBoard(prev => [...prev, instance]);
    // NO sumar aquí — finalizeAfterAction se encarga de sumar el valor
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
      border: 3px solid rgba(66,133,244,0.95); /* azul */
      border-radius: 8px;
      animation: burnPulse 1.2s infinite;
    }
    .politician-red {
      border: 3px solid darkred;
      border-radius: 8px;
    }
  `;

  // util para detectar si hay politicians en tablero (usado en render para borde rojo)
  const isPolitician = c => c.type === "politician" || c.isPolitician;

  // Determinar si jugador tiene tree en mano para mostrar botón "Terminar Turno" si quieres
  const playerHasTreeInHand = playerHand.some(c => c.type === "tree");

  // Manejar "Terminar Turno" (solo jugador) - si necesita
  function handleEndTurnClick() {
    if (!isPlayerTurn) return;
    if (selectingBurnTarget || selectingLumberTarget || selectingContractTarget) return;
    finalizeAfterAction(true, 0);
  }
  
  const cardStyle = {
    width: "80px",
    height: "110px",
    borderRadius: "8px",
    boxShadow: "0 0 6px rgba(0,0,0,0.25)"
  };

  function handlePlayerCardClick(card) {
  playCard(card, true);
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        padding: 20,
        marginLeft: "260px" // mueve el juego para dejar espacio al panel izquierdo
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
          boxShadow: "2px 0 6px rgba(0,0,0,0.1)"
        }}
      >
        <h3 style={{ color: "#917b00ff" }}>Reglas</h3>


        <p><strong>Objetivo:</strong> Llegar a 20 puntos plantando árboles.</p>

        <h4>Cartas</h4>
        <ul>
          <li><strong>Árbol:</strong> Suma su valor a tu puntaje.</li>
          <li><strong>Fogata:</strong> Quita 1 carta del tablero enemigo.</li>
          <li><strong>Incendio:</strong> Quita 2 cartas del tablero enemigo.</li>
          <li><strong>Leñador:</strong> Elimina un árbol del enemigo.</li>
          <li><strong>Político:</strong> Bloquea al rival para plantar árboles.</li>
          <li><strong>Contrato:</strong> Elimina el Político que te bloquea.</li>
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
            borderRadius: 16
          }}
        >
          {isPlayerTurn ? "Tu Turno" : "Turno del Bot"}
        </div>

        {isPlayerTurn && (
          <button
            onClick={handleEndTurnClick}
            disabled={
              selectingBurnTarget ||
              selectingLumberTarget ||
              selectingContractTarget
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
            else if (selectingContractTarget && isPolitician(c))
              cls = "contract-target";

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
                  if (selectingContractTarget)
                    handleContractTarget(i, true);
                }}
                style={{
                  cursor:
                    selectingBurnTarget ||
                    selectingLumberTarget ||
                    selectingContractTarget
                      ? "pointer"
                      : "default",
                  ...extraStyle
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
                selectingBurnTarget ||
                selectingLumberTarget ||
                selectingContractTarget
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
  );
}


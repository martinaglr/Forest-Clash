// src/Game.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Badge,
    Modal,
    ProgressBar,
    Navbar,
    Alert,
    Dropdown,
} from "react-bootstrap";
import CardComponent from "./Cards/Card";
import { cards as allCards } from "./Cards/Card";
import backgroundMusic from "./Videos/miAudio.mp3";
import Login from "./Login";
import GeminiChat from "./components/GeminiChat";
import WeatherWidget from "./components/WeatherWidget";
import config from "./config";

function makeInstance(card) {
    return {
        ...card,
        instanceId: `${card.id}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    };
}

export default function Game({ user, setUser }) {
    const GOAL = 20;
    const [playerTrees, setPlayerTrees] = useState(0);
    const [botTrees, setBotTrees] = useState(0);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [gameOver, setGameOver] = useState(false);

    const [playerHand, setPlayerHand] = useState([]);
    const [botHand, setBotHand] = useState([]);
    const [playerBoard, setPlayerBoard] = useState([]);
    const [botBoard, setBotBoard] = useState([]);

    const [selectingBurnTarget, setSelectingBurnTarget] = useState(false);
    const [pendingFireCard, setPendingFireCard] = useState(null);
    const [selectingLumberTarget, setSelectingLumberTarget] = useState(false);
    const [pendingLumberCard, setPendingLumberCard] = useState(null);
    const [selectingContractTarget, setSelectingContractTarget] = useState(false);
    const [pendingContractCard, setPendingContractCard] = useState(null);

    const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
    const [playerHasPolitician, setPlayerHasPolitician] = useState(false);
    const [botHasPolitician, setBotHasPolitician] = useState(false);

    const [history, setHistory] = useState([]);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = React.useRef(null);

    // Modals
    const [showRules, setShowRules] = useState(false);
    const [showAITips, setShowAITips] = useState(false);
    const [showWeather, setShowWeather] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [gamesHistory, setGamesHistory] = useState([]);
    const [selectedCardPreview, setSelectedCardPreview] = useState(null);

    // Logros
    const achievementsList = [
        {
            id: 1,
            title: "Asesino 🔥",
            description: "Quemas un político con Fogata.",
            condition: (_, burned) => burned >= 1,
        },
        {
            id: 2,
            title: "Traficante de Personas 🪓",
            description: "Robas un político con Leñador.",
            condition: (_, __, stolen) => stolen >= 1,
        },
        {
            id: 3,
            title: "Amigo de mis enemigos 🤝",
            description: "Usas Contrato en un político del bot.",
            condition: (_, __, ___, contracted) => contracted >= 1,
        },
        {
            id: 4,
            title: "Yo no tengo enemigos 🕊️",
            description:
                "Ganas sin usar Fogata, Leñador, Políticos ni Incendio Forestal.",
            condition: (_, __, ___, ____, cleanWin) => cleanWin,
        },
    ];

    // Estados para logros
    const [burnedPoliticians, setBurnedPoliticians] = useState(0);
    const [stolenPoliticians, setStolenPoliticians] = useState(0);
    const [contractedPoliticians, setContractedPoliticians] = useState(0);

    const [usedFire, setUsedFire] = useState(false);
    const [usedLumber, setUsedLumber] = useState(false);
    const [usedPolitician, setUsedPolitician] = useState(false);
    const [usedWildfire, setUsedWildfire] = useState(false);

    const [cleanWin, setCleanWin] = useState(false);

    // Lista de logros obtenidos
    const [achievedAchievements, setAchievedAchievements] = useState([]);

    // Colores (fusionados / nuevos)
    const colors = {
        headerBg: "#4f270aff",
        border: "#2e1500ff",
        headerText: "white",
        bodyBg: "#ffe4ceff",
    };
    const coloresArriba = {
        navbarBg: "#003c21ff",
        navbarText: "white",
        buttonText: "white",
        buttonBorder: "white",
    };
    const coloresBot = {
        headerBg: "#8C3B3B",
        border: "#2e1500ff",
        headerText: "white",
        bodyBg: "#ffe4ceff",
    };

    // Preview
    const showCardPreview = (card) => {
        setSelectedCardPreview(card);
    };
    const closeCardPreview = () => setSelectedCardPreview(null);

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

    // Logout
    const handleLogout = () => {
        console.log("🚪 Cerrando sesión...");
        localStorage.removeItem("token");
        setUser(null);
        alert("Sesión cerrada exitosamente");
    };

    // Cargar historial de partidas (usa config.apiUrl)
    const loadGamesHistory = async () => {
        const token = localStorage.getItem("token");
        if (!token || !user) return;

        try {
            const response = await fetch(`${config.apiUrl}/games`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const games = await response.json();
                setGamesHistory(games);
                setShowHistory(true);
                console.log("📊 Historial cargado:", games);
            }
        } catch (error) {
            console.error("Error al cargar historial:", error);
        }
    };

    useEffect(() => {
        function drawInitialHand() {
            const deck = [...allCards];
            const shuffled = deck.sort(() => Math.random() - 0.5);
            return shuffled.slice(0, 5).map((c) => makeInstance(c));
        }
        setPlayerHand(drawInitialHand());
        setBotHand(drawInitialHand());
        setHasDrawnThisTurn(false);
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    function drawCardForPlayer() {
        setPlayerHand((prev) => {
            if (prev.length >= 5) return prev;
            const c = makeInstance(
                allCards[Math.floor(Math.random() * allCards.length)]
            );
            return [...prev, c];
        });
    }

    function drawCardForBot() {
        setBotHand((prev) => {
            if (prev.length >= 5) return prev;
            const c = makeInstance(
                allCards[Math.floor(Math.random() * allCards.length)]
            );
            return [...prev, c];
        });
    }

    // Guardar partida en MongoDB
    const saveGameToDatabase = async (winner, finalPlayerScore, finalBotScore) => {
        if (!user) {
            console.log("❌ Usuario no logueado, no se guarda la partida");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const response = await fetch(`${config.apiUrl}/games`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    playerScore: finalPlayerScore,
                    botScore: finalBotScore,
                    winner: winner,
                    duration: 0,
                    moves: history.map((h) => ({
                        player: h.player,
                        action: h.move,
                        timestamp: new Date(h.time),
                    })),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("✅ Partida guardada en MongoDB:", data);
            } else {
                console.error("❌ Error al guardar partida");
            }
        } catch (error) {
            console.error("💥 Error al conectar con el servidor:", error);
        }
    };

    function finalizeAfterAction(byPlayer, addedValue = 0) {
        setTimeout(() => {
            if (byPlayer) {
                setPlayerTrees((prev) => {
                    const newTotal = prev + addedValue;
                    if (newTotal >= GOAL) {
                        setGameOver(true);
                        saveGameToDatabase("player", newTotal, botTrees);
                        setTimeout(() => alert("¡Ganaste! 🎉"), 20);
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
                        saveGameToDatabase("bot", playerTrees, newTotal);
                        setTimeout(() => alert("¡El bot gana! 🤖"), 20);
                        return newTotal;
                    }
                    setIsPlayerTurn(true);
                    setHasDrawnThisTurn(false);
                    return newTotal;
                });
            }
        }, 50);
    }

    const botPlay = useCallback(
        () => {
            if (gameOver) return;
            if (isPlayerTurn) return;

            const hasPolitician = botBoard.some(
                (card) => card.type === "politician" || card.isPolitician
            );
            const contractCard = botHand.find((card) => card.type === "contract");

            if (hasPolitician) {
                if (!contractCard) {
                    setIsPlayerTurn(true);
                    setHasDrawnThisTurn(false);
                    return;
                } else {
                    const idx = botBoard.findIndex(
                        (c) => c.type === "politician" || c.isPolitician
                    );
                    if (idx !== -1) {
                        setBotHand((prev) =>
                            prev.filter((c) => c.instanceId !== contractCard.instanceId)
                        );
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
        },
        // dependencies
        [gameOver, isPlayerTurn, botBoard, botHand, playerBoard]
    );

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

    // UseEffect para marcar cleanWin si llegas a GOAL sin usar malas acciones
    useEffect(() => {
        if (playerTrees >= GOAL) {
            const noBadActions =
                !usedFire && !usedLumber && !usedPolitician && !usedWildfire;

            if (noBadActions) {
                setCleanWin(true);
            }
        }
    }, [playerTrees, usedFire, usedLumber, usedPolitician, usedWildfire]);

    // Sistema Automatico de detección de logros
    useEffect(() => {
        achievementsList.forEach((ach) => {
            const achieved = ach.condition(
                null,
                burnedPoliticians,
                stolenPoliticians,
                contractedPoliticians,
                cleanWin
            );

            if (achieved && !achievedAchievements.includes(ach.id)) {
                setAchievedAchievements((prev) => [...prev, ach.id]);
            }
        });
    }, [
        burnedPoliticians,
        stolenPoliticians,
        contractedPoliticians,
        cleanWin,
        achievedAchievements,
    ]);

    function playCard(card, byPlayer = true) {
        if (gameOver) return;
        if (byPlayer && !isPlayerTurn) return;
        if (!byPlayer && isPlayerTurn) return;

        const label = card.name ?? card.type;

        if (card.type === "politician") {
            if (byPlayer) {
                setBotBoard((prev) => [...prev, { ...card, isPolitician: true }]);
                setBotHasPolitician(true);
                setPlayerHand((prev) =>
                    prev.filter((c) => c.instanceId !== card.instanceId)
                );
                addHistory(true, `Político -> placed on Bot`);
                setUsedPolitician(true);
            } else {
                setPlayerBoard((prev) => [...prev, { ...card, isPolitician: true }]);
                setPlayerHasPolitician(true);
                setBotHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
                addHistory(false, `Político -> placed on Player`);
            }
            finalizeAfterAction(byPlayer, 0);
            return;
        }

        if (
            (selectingBurnTarget || selectingLumberTarget || selectingContractTarget) &&
            byPlayer
        ) {
            // si ya estamos en modo selección por alguna carta, no permitir jugar otra carta normal
            return;
        }

        if (card.type === "fire" && byPlayer) {
            setSelectingBurnTarget(true);
            setPendingFireCard(card);
            return;
        }

        if (card.type === "lumberjack" && byPlayer) {
            setSelectingLumberTarget(true);
            setPendingLumberCard(card);
            return;
        }

        if (card.type === "contract" && byPlayer) {
            setSelectingContractTarget(true);
            setPendingContractCard(card);
            return;
        }

        // Consumir la carta
        if (byPlayer) {
            setPlayerHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
        } else {
            setBotHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
        }

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
                    const idxSelf = botBoard.findIndex(
                        (c) => c.type === "politician" || c.isPolitician
                    );
                    if (idxSelf !== -1) {
                        const removed = botBoard[idxSelf];
                        const val = removed.value ?? 0;
                        setBotBoard((prev) => prev.filter((_, i) => i !== idxSelf));
                        setBotTrees((t) => Math.max(0, t - val));
                        setBotHasPolitician(false);
                        addHistory(false, `Contract -> removed own Politician`);
                    } else {
                        const idxOpp = playerBoard.findIndex(
                            (c) => c.type === "politician" || c.isPolitician
                        );
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
                    setUsedWildfire(true);
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

        finalizeAfterAction(byPlayer, card.type === "tree" ? card.value ?? 1 : 0);
    }

    function handleBurnTarget(index) {
        if (!selectingBurnTarget || !pendingFireCard) return;
        if (index < 0 || index >= botBoard.length) return;

        const cardToBurn = botBoard[index];
        const val = cardToBurn.value ?? 1;

        setBotBoard((prev) => prev.filter((_, i) => i !== index));
        setBotTrees((t) => Math.max(0, t - val));

        // eliminar la fogata usada de la mano
        setPlayerHand((prev) =>
            prev.filter((c) => c.instanceId !== pendingFireCard.instanceId)
        );

        addHistory(true, `Fogata -> burned ${cardToBurn.name ?? "tree"}`);

        // reset
        setPendingFireCard(null);
        setSelectingBurnTarget(false);

        // logro "Asesino" si quemaste un político
        if (isPolitician(cardToBurn)) {
            setBurnedPoliticians((prev) => prev + 1);
        }

        // marcar que usaste fogata en esta partida
        setUsedFire(true);

        finalizeAfterAction(true, 0);
    }

    function handleLumberTarget(index) {
        if (!selectingLumberTarget || !pendingLumberCard) return;
        if (index < 0 || index >= botBoard.length) return;

        const stolen = botBoard[index];
        const val = stolen.value ?? 1;

        // remover del bot
        setBotBoard((prev) => prev.filter((_, i) => i !== index));
        setBotTrees((t) => Math.max(0, t - val));

        // agregar al jugador
        const newInstance = makeInstance({ ...stolen, id: stolen.id });
        setPlayerBoard((prev) => [...prev, newInstance]);
        setPlayerTrees((t) => t + val);

        // eliminar carta de leñador usada
        setPlayerHand((prev) =>
            prev.filter((c) => c.instanceId !== pendingLumberCard.instanceId)
        );

        addHistory(true, `Leñador -> stole ${stolen.name ?? "tree"}`);

        // reset
        setPendingLumberCard(null);
        setSelectingLumberTarget(false);

        // logro: Traficante de personas (robar un político)
        if (isPolitician(stolen)) setStolenPoliticians((prev) => prev + 1);

        // marcamos que usaste leñador en la partida
        setUsedLumber(true);

        finalizeAfterAction(true, 0);
    }

    function handleContractTarget(index, targetIsBot = true) {
        if (!selectingContractTarget || !pendingContractCard) return;

        const board = targetIsBot ? botBoard : playerBoard;
        const setBoard = targetIsBot ? setBotBoard : setPlayerBoard;
        const setHasPolitician = targetIsBot
            ? setBotHasPolitician
            : setPlayerHasPolitician;
        const setTrees = targetIsBot ? setBotTrees : setPlayerTrees;

        if (index < 0 || index >= board.length) return;

        const candidate = board[index];

        if (!(candidate.type === "politician" || candidate.isPolitician)) {
            alert("Debes seleccionar un Político como objetivo del Contrato");
            return;
        }

        // guarda la carta antes de borrarla
        const cardToRemove = candidate;
        const val = candidate.value ?? 0;

        // eliminas del board
        setBoard((prev) => prev.filter((_, i) => i !== index));
        setTrees((t) => Math.max(0, t - val));
        setHasPolitician(false);

        setPlayerHand((prev) =>
            prev.filter((c) => c.instanceId !== pendingContractCard.instanceId)
        );

        addHistory(
            true,
            `Contract -> removed ${targetIsBot ? "Bot" : "Your"} Politician`
        );

        setPendingContractCard(null);
        setSelectingContractTarget(false);

        finalizeAfterAction(true, 0);

        // logro: contrato en político
        if (isPolitician(cardToRemove)) {
            setContractedPoliticians((prev) => prev + 1);
        }
    }

    function addTreeToBoard(card, byPlayer, setSelfBoard) {
        const instance = makeInstance(card);
        setSelfBoard((prev) => [...prev, instance]);
    }

    function handleEndTurnClick() {
        if (!isPlayerTurn) return;
        if (selectingBurnTarget || selectingLumberTarget || selectingContractTarget)
            return;
        finalizeAfterAction(true, 0);
    }

    const isPolitician = (c) => c.type === "politician" || c.isPolitician;

    // Cancelar acción
    const cancelAction = () => {
        setSelectingBurnTarget(false);
        setSelectingLumberTarget(false);
        setSelectingContractTarget(false);
        setPendingFireCard(null);
        setPendingLumberCard(null);
        setPendingContractCard(null);
    };

    return (
        <>
            <div style={{ backgroundColor: "#bd8663ff", minHeight: "100vh" }}>
                <audio
                    ref={audioRef}
                    src={backgroundMusic}
                    autoPlay
                    loop
                    muted={isMuted}
                    style={{ display: "none" }}
                />

                {/* NAVBAR */}
                <Navbar style={{ backgroundColor: coloresArriba.navbarBg }} className="mb-3">
                    <Container fluid>
                        <Navbar.Brand
                            href="#"
                            style={{
                                color: coloresArriba.navbarText,
                                fontWeight: "bold",
                                fontSize: "1.25rem",
                            }}
                        >
                            🌲 Forest Clash
                        </Navbar.Brand>

                        <div className="d-flex gap-1 gap-md-2 align-items-center flex-wrap">
                            <Button
                                size="sm"
                                onClick={() => setShowRules(true)}
                                style={{
                                    color: coloresArriba.buttonText,
                                    borderColor: coloresArriba.buttonBorder,
                                }}
                                variant="outline-light"
                            >
                                <span className="d-none d-md-inline">📖 Reglas</span>
                                <span className="d-inline d-md-none">📖</span>
                            </Button>

                            <Button variant="outline-light" size="sm" onClick={() => setShowWeather(true)}>
                                🌦️ Clima
                            </Button>

                            <Button variant="outline-light" size="sm" onClick={() => setIsMuted(!isMuted)}>
                                {isMuted ? "🔇" : "🔊"}
                            </Button>

                            {/* BOTÓN DE LOGIN/USUARIO */}
                            {user ? (
                                <Dropdown align="end">
                                    <Dropdown.Toggle
                                        variant="light"
                                        size="sm"
                                        className="d-flex align-items-center gap-1 gap-md-2"
                                        style={{ maxWidth: "150px" }}
                                    >
                                        {user.avatar && (
                                            <img
                                                src={user.avatar}
                                                alt={user.displayName || user.username}
                                                style={{
                                                    width: "25px",
                                                    height: "25px",
                                                    borderRadius: "50%",
                                                    border: "2px solid white",
                                                    flexShrink: 0,
                                                }}
                                            />
                                        )}
                                        <span className="text-truncate d-none d-sm-inline" style={{ maxWidth: "100px" }}>
                      {user.displayName || user.username}
                    </span>
                                        <span className="d-inline d-sm-none">👤</span>
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                        <Dropdown.ItemText>
                                            <small className="text-muted">{user.email}</small>
                                        </Dropdown.ItemText>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={loadGamesHistory}>📊 Historial de Partidas</Dropdown.Item>
                                        <Dropdown.Item>
                                            🏆 Mis Estadísticas
                                            <div className="mt-2">
                                                <small className="d-block">Jugadas: {user.stats?.gamesPlayed || 0}</small>
                                                <small className="d-block">Ganadas: {user.stats?.gamesWon || 0}</small>
                                                <small className="d-block">Perdidas: {user.stats?.gamesLost || 0}</small>
                                                <small className="d-block">Máximo: {user.stats?.highestScore || 0}</small>
                                            </div>
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={handleLogout} className="text-danger">
                                            🚪 Cerrar Sesión
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            ) : (
                                <Button variant="light" size="sm" onClick={() => setShowLogin(true)} className="text-nowrap">
                                    <span className="d-none d-sm-inline">🔒 Iniciar Sesión</span>
                                    <span className="d-inline d-sm-none">🔒</span>
                                </Button>
                            )}
                        </div>
                    </Container>
                </Navbar>

                <Container fluid>
                    <Row>
                        {/* COLUMNA IZQUIERDA: Historial */}
                        <Col md={3} className="mb-3">
                            <Card bg="light">
                                <Card.Header className="bg-secondary text-white fw-bold">📜 Historial</Card.Header>
                                <Card.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
                                    {history.length === 0 ? (
                                        <small className="text-muted">Aún no hay jugadas</small>
                                    ) : (
                                        history.slice().reverse().map((h, i) => (
                                            <div key={i} className="border-bottom pb-1 mb-1">
                                                <small><strong>{h.player}:</strong> {h.move}</small>
                                            </div>
                                        ))
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* COLUMNA CENTRAL: Juego */}
                        <Col md={6}>
                            {/* Indicador de turno */}
                            <div className="text-center mb-3">
                                <Badge bg={isPlayerTurn ? "success" : "danger"} className="fs-5 p-2">
                                    {isPlayerTurn ? "🎮 Tu Turno" : "🤖 Turno del Bot"}
                                </Badge>
                                {isPlayerTurn && (
                                    <Button
                                        variant="primary"
                                        className="ms-3"
                                        onClick={handleEndTurnClick}
                                        disabled={selectingBurnTarget || selectingLumberTarget || selectingContractTarget}
                                    >
                                        Terminar Turno
                                    </Button>
                                )}
                            </div>

                            {/* Tablero del Bot */}
                            <Card className="mb-4" style={{ border: `3px solid ${coloresBot.border}`, borderRadius: "10px" }}>
                                <Card.Header style={{ backgroundColor: coloresBot.headerBg, color: coloresBot.headerText }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">🤖 Bot: {botTrees} / {GOAL}</span>
                                        <ProgressBar
                                            now={(botTrees / GOAL) * 100}
                                            variant={
                                                botTrees >= GOAL * 0.9 ? "danger" :
                                                    botTrees >= GOAL * 0.5 ? "warning" :
                                                        "success"
                                            }
                                            style={{ width: "200px" }}
                                        />
                                    </div>
                                </Card.Header>

                                <Card.Body style={{ backgroundColor: coloresBot.bodyBg }}>
                                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                                        {botBoard.map((c, i) => (
                                            <div
                                                key={c.instanceId}
                                                onClick={() => {
                                                    if (selectingBurnTarget) handleBurnTarget(i);
                                                    if (selectingLumberTarget) handleLumberTarget(i);
                                                    if (selectingContractTarget) handleContractTarget(i, true);
                                                }}
                                                style={{
                                                    cursor: (selectingBurnTarget || selectingLumberTarget || selectingContractTarget) ? "pointer" : "default",
                                                    border: isPolitician(c)
                                                        ? "3px solid darkred"
                                                        : selectingBurnTarget
                                                            ? "3px solid orange"
                                                            : selectingLumberTarget
                                                                ? "3px solid green"
                                                                : selectingContractTarget && isPolitician(c)
                                                                    ? "3px solid blue"
                                                                    : "none",
                                                    borderRadius: "8px",
                                                    padding: "5px"
                                                }}
                                            >
                                                <img src={c.img} alt={c.name} style={{ width: "80px", height: "110px", borderRadius: "8px" }} />
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Tablero del Jugador */}
                            <Card className="mb-4" style={{ border: `3px solid ${colors.border}`, borderRadius: "10px" }}>
                                <Card.Header style={{ backgroundColor: colors.headerBg, color: colors.headerText, fontWeight: "bold" }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span>👤 Tú: {playerTrees} / {GOAL}</span>
                                        <ProgressBar
                                            now={(playerTrees / GOAL) * 100}
                                            variant={
                                                playerTrees >= GOAL * 0.9 ? "danger" :
                                                    playerTrees >= GOAL * 0.5 ? "warning" :
                                                        "success"
                                            }
                                            style={{ width: "200px" }}
                                        />
                                    </div>
                                </Card.Header>

                                <Card.Body style={{ backgroundColor: colors.bodyBg }}>
                                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                                        {playerBoard.map((c, i) => (
                                            <div
                                                key={c.instanceId}
                                                onClick={() => {
                                                    if (selectingContractTarget) handleContractTarget(i, false);
                                                }}
                                                style={{
                                                    border: isPolitician(c)
                                                        ? "3px solid darkred"
                                                        : selectingContractTarget && isPolitician(c)
                                                            ? "3px solid blue"
                                                            : "none",
                                                    borderRadius: "8px",
                                                    padding: "5px"
                                                }}
                                            >
                                                <img src={c.img} alt={c.name} style={{ width: "80px", height: "110px", borderRadius: "8px" }} />
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Mano del Jugador */}
                            <Card className="mb-4" style={{ border: "2px solid #001f3f" }}>
                                <Card.Header style={{ backgroundColor: "#001f3f", color: "white", fontWeight: "bold" }}>
                                    🃏 Tu Mano
                                </Card.Header>

                                <Card.Body>
                                    {selectingBurnTarget && (
                                        <Alert variant="warning">🔥 Selecciona un árbol del bot para quemar</Alert>
                                    )}
                                    {selectingLumberTarget && (
                                        <Alert variant="info">🪓 Selecciona un árbol del bot para robar</Alert>
                                    )}
                                    {selectingContractTarget && (
                                        <Alert variant="primary">📜 Selecciona un Político para eliminar</Alert>
                                    )}

                                    {/* Botón cancelar acción */}
                                    {(selectingBurnTarget || selectingLumberTarget || selectingContractTarget) && (
                                        <Button
                                            variant="secondary"
                                            className="w-100 mb-2 fw-bold"
                                            onClick={cancelAction}
                                        >
                                            ❌ Cancelar acción
                                        </Button>
                                    )}

                                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                                        {playerHand.map((c) => (
                                            <div
                                                key={c.instanceId}
                                                onClick={() =>
                                                    !selectingBurnTarget &&
                                                    !selectingLumberTarget &&
                                                    !selectingContractTarget &&
                                                    playCard(c, true)
                                                }
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    showCardPreview(c);
                                                }}
                                                style={{
                                                    cursor:
                                                        selectingBurnTarget || selectingLumberTarget || selectingContractTarget
                                                            ? "not-allowed"
                                                            : "pointer",
                                                    opacity:
                                                        selectingBurnTarget || selectingLumberTarget || selectingContractTarget
                                                            ? 0.5
                                                            : 1,
                                                    transition: "transform 0.2s",
                                                    position: "relative",
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-10px)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                                title="Click derecho para ver más grande"
                                            >
                                                <img
                                                    src={c.img}
                                                    alt={c.name}
                                                    style={{
                                                        width: "80px",
                                                        height: "110px",
                                                        borderRadius: "8px",
                                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* COLUMNA DERECHA: Info */}
                        <Col md={3}>
                            <Card style={{ backgroundColor: "#3A8FB7", color: "white" }} className="mb-3">
                                <Card.Header className="fw-bold">ℹ️ Información</Card.Header>
                                <Card.Body>
                                    <p className="mb-1"><strong>Objetivo:</strong> Plantar {GOAL} árboles</p>
                                    <p className="mb-1"><strong>Cartas en mano:</strong> {playerHand.length}/5</p>
                                    <p className="mb-0"><strong>Turno:</strong> {isPlayerTurn ? "Tuyo" : "Bot"}</p>
                                </Card.Body>
                            </Card>

                            <Card bg="warning" className="mb-3">
                                <Card.Header className="fw-bold">🎵 Audio</Card.Header>
                                <Card.Body>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        disabled={isMuted}
                                        className="form-range"
                                    />
                                    <Button
                                        variant={isMuted ? "danger" : "success"}
                                        size="sm"
                                        className="w-100 mt-2"
                                        onClick={() => setIsMuted(!isMuted)}
                                    >
                                        {isMuted ? "Activar Audio" : "Silenciar"}
                                    </Button>
                                </Card.Body>
                            </Card>

                            {/* LOGROS */}
                            <Card className="shadow" style={{ width: "337px", border: "2px solid #333" }}>
                                <Card.Header className="fw-bold bg-dark text-white">🏆 Logros</Card.Header>
                                <Card.Body style={{ maxHeight: "250px", overflowY: "auto" }}>
                                    <table className="table table-sm table-striped">
                                        <tbody>
                                        {achievementsList.map((ach) => (
                                            <tr key={ach.id}>
                                                <td style={{ width: "30px" }}>
                                                    {achievedAchievements.includes(ach.id) ? "✅" : "❌"}
                                                </td>
                                                <td>
                                                    <strong>{ach.title}</strong>
                                                    <br />
                                                    <small>{ach.description}</small>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>

                {/* MODAL: Login */}
                <Modal show={showLogin} onHide={() => setShowLogin(false)} centered>
                    <Modal.Body className="p-0">
                        <Button
                            variant="link"
                            className="position-absolute top-0 end-0 m-2 text-dark"
                            onClick={() => setShowLogin(false)}
                            style={{ zIndex: 1, textDecoration: "none", fontSize: "24px" }}
                        >
                            ✕
                        </Button>
                        <Login
                            onLoginSuccess={(userData) => {
                                console.log("✅ Login exitoso en Game.jsx:", userData.username);
                                setUser(userData);
                                setShowLogin(false);
                            }}
                        />
                    </Modal.Body>
                </Modal>

                {/* MODAL: Preview de carta (click derecho) */}
                <Modal show={!!selectedCardPreview} onHide={closeCardPreview} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{selectedCardPreview?.name ?? "Carta"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="text-center">
                        {selectedCardPreview && (
                            <>
                                <img src={selectedCardPreview.img} alt={selectedCardPreview.name} style={{ maxWidth: "250px" }} />
                                <p className="mt-3"><strong>Tipo:</strong> {selectedCardPreview.type}</p>
                                {selectedCardPreview.value !== undefined && <p><strong>Valor:</strong> {selectedCardPreview.value}</p>}
                                <p>{selectedCardPreview.description}</p>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={closeCardPreview}>Cerrar</Button>
                    </Modal.Footer>
                </Modal>

                {/* MODAL: Reglas */}
                <Modal show={showRules} onHide={() => setShowRules(false)} size="lg">
                    <Modal.Header closeButton className="bg-success text-white">
                        <Modal.Title>📖 Reglas del Juego</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <h5>Objetivo</h5>
                        <p>Llegar a {GOAL} puntos plantando árboles antes que el bot.</p>

                        <h5>Cartas</h5>
                        <ul>
                            <li><strong>🌲 Árbol:</strong> Suma su valor a tu puntaje</li>
                            <li><strong>🔥 Fogata:</strong> Quema 1 carta del tablero enemigo</li>
                            <li><strong>💥 Incendio (Wildfire):</strong> Elimina todo el tablero enemigo</li>
                            <li><strong>🪓 Leñador:</strong> Roba un árbol del enemigo</li>
                            <li><strong>🎩 Político:</strong> Bloquea plantar árboles y tiene efectos especiales</li>
                            <li><strong>📜 Contrato:</strong> Remueve un Político objetivo</li>
                        </ul>

                        <h5>Turnos</h5>
                        <p>Al inicio de tu turno robas 1 carta (si tienes menos de 5). Juega una carta y termina turno o usa "Terminar Turno".</p>

                        <h5>Acciones especiales</h5>
                        <p>Al usar Fogata, Leñador o Contrato debes seleccionar el objetivo en el tablero enemigo (o propio en caso de bot). Usa el botón "Cancelar acción" para anular una selección antes de confirmar.</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRules(false)}>Cerrar</Button>
                    </Modal.Footer>
                </Modal>

                {/* MODAL: Historial de partidas (desde API) */}
                <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>📊 Historial de Partidas</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {gamesHistory.length === 0 ? (
                            <p className="text-muted">No hay partidas guardadas.</p>
                        ) : (
                            <div>
                                {gamesHistory.map((g, i) => (
                                    <Card key={i} className="mb-2">
                                        <Card.Body>
                                            <strong>{g.winner === "player" ? "Tú" : "Bot"}</strong>
                                            <div><small>Player: {g.playerScore} - Bot: {g.botScore}</small></div>
                                            <div><small>Fecha: {new Date(g.createdAt || g.date || Date.now()).toLocaleString()}</small></div>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowHistory(false)}>Cerrar</Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </>
    );
}

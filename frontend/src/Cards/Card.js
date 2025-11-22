import Arbol1 from './Arbol1.png';
import Arbol2 from './Arbol2.png';
import Arbol3 from './Arbol3.png';
import Arbol4 from './Arbol4.png';
import Fogata from './Fogata.png';
import Politico from './Politico.png';
import Contrato from './Contrato.png';
import Lenador from './Leñador.png'; // Asegúrate de que el archivo se llame exactamente "Leñador.png"
import Incendio from './Incendio.png';

// Array de cartas
export const cards = [
  { id: "tree1", type: "tree", value: 1, name: "Árbol x1", img: Arbol1 },
  { id: "tree2", type: "tree", value: 2, name: "Árbol x2", img: Arbol2 },
  { id: "tree3", type: "tree", value: 3, name: "Árbol x3", img: Arbol3 },
  { id: "tree4", type: "tree", value: 4, name: "Árbol x4", img: Arbol4 },
  { id: "fogata", type: "fire", name: "Fogata", img: Fogata },
  { id: "lenador", type: "lumberjack", name: "Leñador", img: Lenador },
  { id: "politician", type: "politician", name: "Político", img: Politico },
  { id: "contrato", type: "contract", name: "Contrato", img: Contrato },
  { id: "incendio", type: "wildfire", name: "Incendio Forestal", img: Incendio }
];

// Componente de carta
export default function Card({ card, onPlay }) {
  return (
    <div
      onClick={() => onPlay(card)}
      style={{
        cursor: "pointer",
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 10,
        margin: 10,
        width: 140,
        textAlign: "center",
        background: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
      }}
    >
      <img
        src={card.img}
        alt={card.name}
        style={{ width: "120px", height: "120px", objectFit: "contain" }}
      />
      <h4>{card.name}</h4>
    </div>
  );
}

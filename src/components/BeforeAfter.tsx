import { useState } from 'react';

export default function BeforeAfter({ before, after, beforeAlt, afterAlt }: { before: string; after: string; beforeAlt: string; afterAlt: string }) {
  const [position, setPosition] = useState(50);
  return (
    <div className="compare" style={{ '--position': `${position}%` } as React.CSSProperties}>
      <img src={before} alt={beforeAlt} width="1000" height="650" />
      <img className="compare-after" src={after} alt={afterAlt} width="1000" height="650" />
      <span className="compare-label before">Antes</span><span className="compare-label after">Después</span>
      <span className="compare-line" aria-hidden="true" />
      <label className="sr-only" htmlFor="comparison">Mostrar más o menos de la versión final</label>
      <input id="comparison" type="range" min="0" max="100" value={position} onChange={(e) => setPosition(Number(e.target.value))} aria-valuetext={`${position}% de la versión final`} />
    </div>
  );
}

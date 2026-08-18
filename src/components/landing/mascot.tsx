// @ts-nocheck
/* eslint-disable */
import React from "react";
import { L2 } from "./ds";

// matchfoundr · Maskottchen als React-Baustein für Landing v2.
// Umhüllt die imperative Engine aus mf-mascot.js. `size` darf jede CSS-Länge
// sein (px oder em) — der Ball füllt genau diese Box, die Bahnen ragen darüber
// hinaus (overflow visible), damit ein Orbit im Fließtext nichts umbricht.

export function MFDot({
  size = 20, ink = '#E2511C', paper = '#FAF8F3', state = 'idle',
  cycle = null, follow = false, intro = false, align = 'baseline', style
}) {
  const host = React.useRef(null);
  const bot = React.useRef(null);
  React.useEffect(() => {
    if (!MFMascot) return;
    bot.current = new MFMascot.Mascot(host.current, {
      ink, paper, follow, intro,
      mode: cycle ? 'sequence' : 'state',
      state: cycle ? cycle[0] : state,
      cycle: cycle || undefined
    });
    return () => { if (bot.current) bot.current.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => { if (bot.current) { bot.current.ink = ink; bot.current.paper = paper; } }, [ink, paper]);
  React.useEffect(() => { if (bot.current && !cycle) bot.current.setState(state); }, [state, cycle]);
  const len = typeof size === 'number' ? size + 'px' : size;
  return (
    <span aria-hidden="true" style={{ position: 'relative', display: 'inline-block', width: len, height: len,
      verticalAlign: align, flexShrink: 0, ...style }}>
      <span ref={host} style={{ position: 'absolute', left: '50%', top: '50%', width: '158%', height: '158%',
        transform: 'translate(-50%,-50%)' }}/>
    </span>
  );
};

// Der Punkt der Wortmarke — überall gleich gesetzt.
export function MFWordmarkDot({ size = '0.42em', ink, paper, follow = true }) {
  return <MFDot size={size} ink={ink || L2.ember} paper={paper || L2.canvas} follow={follow} style={{ marginLeft: '.04em' }}/>;
};

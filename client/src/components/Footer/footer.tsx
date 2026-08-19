import React from 'react';

function Footer() {
  const style: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100vw',
    borderTop: '0.5px solid var(--ns-rule)',
    textAlign: 'center',
    margin: 0,
    padding: '0.4rem 0',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.03em',
    color: 'var(--ns-graphite)',
    backgroundColor: 'var(--ns-paper)',
  };

  return <div style={style}>© AdamSL394 GH</div>;
}

export default Footer;
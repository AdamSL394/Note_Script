import React from 'react';
import { Link } from 'react-router-dom';

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

  const linkStyle: React.CSSProperties = {
    color: 'var(--ns-graphite)',
    marginLeft: '0.75rem',
  };

  return (
    <div style={style}>
      © AdamSL394 GH
      <Link to="/privacy" style={linkStyle}>Privacy</Link>
      <Link to="/terms" style={linkStyle}>Terms</Link>
    </div>
  );
}

export default Footer;
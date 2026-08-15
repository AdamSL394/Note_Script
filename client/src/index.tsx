import React from 'react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';
import config from './config/config.json';

// `resolveJsonModule` means TS already knows config.json's exact shape —
// `keyof typeof config` gives the real union of environment keys
// automatically, rather than a hand-written interface that could drift.
const enviroment = (process.env.REACT_APP_HOST || 'production') as keyof typeof config;
console.log('current env', enviroment);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in the document.');
}
const root = ReactDOM.createRoot(rootElement);

console.log('auth url', config[enviroment].logoutURL);
root.render(
   <StrictMode>
    <Auth0Provider
      domain={'dev-07j15n0p.us.auth0.com'}
      clientId={'p9eT1rMY70S9ALx8jTH4s9WDi4QBHaRy'}
      redirectUri={config[enviroment].logoutURL}
      returnTo={config[enviroment].logoutURL}
      audience={'https://note-script-api'}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <App />
    </Auth0Provider>
  </StrictMode>
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
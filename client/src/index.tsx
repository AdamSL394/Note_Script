import React from 'react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';
import config from './config/config';


// `resolveJsonModule` means TS already knows config.json's exact shape —
// `keyof typeof config` gives the real union of environment keys
// automatically, rather than a hand-written interface that could drift.


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in the document.');
}
const root = ReactDOM.createRoot(rootElement);

root.render(
   <StrictMode>
    <Auth0Provider
      domain={config["auth0"]["domain"]}
      clientId={config["auth0"]["clientId"]}
      redirectUri={config["logoutURL"]}
      returnTo={config["logoutURL"]}
      audience={config["auth0"]["audience"]}
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
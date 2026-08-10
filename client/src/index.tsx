import React from 'react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import { Auth0Provider } from '@auth0/auth0-react';
import config from './config/config.json';
const enviroment = process.env.REACT_APP_HOST || 'production';
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
   <StrictMode>
    <Auth0Provider
      domain={'dev-07j15n0p.us.auth0.com'}
      clientId={'p9eT1rMY70S9ALx8jTH4s9WDi4QBHaRy'}
      redirectUri={config[enviroment].logoutURL}
      returnTo={config[enviroment].logoutURL}
    >
      <App />
    </Auth0Provider>
  </StrictMode>
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

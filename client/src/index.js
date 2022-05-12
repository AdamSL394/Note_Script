import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import { Auth0Provider } from "@auth0/auth0-react";
// import config from './auth_config.json'

// const result = dotenv.config();

const root = ReactDOM.createRoot(document.getElementById('root'));
console.log('window.location.origin',window.location.origin)

root.render(
  <Auth0Provider
    domain={"dev-07j15n0p.us.auth0.com"}
    clientId={"p9eT1rMY70S9ALx8jTH4s9WDi4QBHaRy"}
    redirectUri={window.location.origin}
    returnTo={window.location.origin}
  >
    <App/>
  </Auth0Provider>

  // </React.StrictMode>,
)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

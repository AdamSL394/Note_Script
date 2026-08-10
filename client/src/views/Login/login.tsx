import React, { useEffect, useState } from 'react';
import LoginButton from '../../components/LoginButton/loginButton.js';
import Footer from '../../components/Footer/footer.js';
import { useNavigate } from 'react-router-dom';
import './login.css';

function Login() {
  const [text, setText] = useState<string | undefined>();

  useEffect(() => {
    const words = ['Note Script'];
    let part: string;
    let i = 0;
    let offset = 0;
    const len = words.length;
    let forwards = true;
    let skipCount = 0;
    const skipDelay = 15;
    const speed = 100;

    let count = 0;
    const a = setInterval(function () {
      if (forwards) {
        if (offset >= words[i].length) {
          ++skipCount;
          if (skipCount === skipDelay) {
            forwards = false;
            skipCount = 0;
          }
        }
      } else {
        if (offset === 0) {
          forwards = true;
          i++;
          offset = 0;
          if (i >= len) {
            i = 0;
          }
        }
      }
      part = words[i].substr(0, offset);
      if (skipCount === 0) {
        if (forwards) {
          offset++;
        } else {
          offset--;
        }
      }
      setText(part);
      count++;
      // 37 script disappears
      // 25 keeps text on screen
      if (count === 25) {
        clearInterval(a);
      }
    }, speed);
  }, []);

  const navigate = useNavigate();

  const home = () => {
    navigate('/');
  };

  return (
    <div>
      <Footer></Footer>
      <LoginButton></LoginButton>
      <button className="appBubble" onClick={home}>
        <span className="icon">NS</span>
      </button>
      <div className="word container">{text}</div>
    </div>
  );
}

export default Login;
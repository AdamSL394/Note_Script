import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button/index.js';
import NoteRoutes from '../../router/noteRoutes';
import './contact.css';

const MAX_MESSAGE_LENGTH = 2000;

const Contact = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const success = await NoteRoutes.submitContactForm(email, message);
    if (success) {
      setStatus('sent');
      setEmail('');
      setMessage('');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="contactPage">
      <button className="contactBack" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="contactCard">
        <p className="contactEyebrow">Get in touch</p>
        <h1 className="contactHeading">Contact</h1>
        <p className="contactIntro">
          Questions, feedback, or something not working right -- send a message below.
        </p>

        {status === 'sent' ? (
          <div className="contactSent">
            <span className="contactSentIcon" aria-hidden="true">✓</span>
            <p className="contactSentMessage">Thanks -- your message has been sent.</p>
          </div>
        ) : (
          <form className="contactForm" onSubmit={handleSubmit}>
            <label className="contactLabel" htmlFor="contact-email">
              Your email
            </label>
            <input
              id="contact-email"
              className="contactInput"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'sending'}
            />

            <label className="contactLabel" htmlFor="contact-message">
              Message
            </label>
            <textarea
              id="contact-message"
              className="contactTextarea"
              required
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === 'sending'}
              rows={6}
            />
            <div className="contactCharCount">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </div>

            {status === 'error' && (
              <p className="contactErrorMessage">
                Something went wrong sending that -- please try again.
              </p>
            )}

            <Button type="submit" variant="contained" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;

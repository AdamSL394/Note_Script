import { useNavigate, Link } from 'react-router-dom';
import './privacyPolicy.css';

// Hardcoded rather than computed at render time -- this is the actual
// date the policy last changed, not "whenever someone happens to load
// the page" (new Date() here previously made every visitor see today's
// date as "last updated", which is misleading, not accurate).
const LAST_UPDATED = 'October 1, 2026';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legalPage">
      <button className="legalBack" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="legalContent">
        <h1>Privacy Policy</h1>
        <p className="legalUpdated">Last updated: {LAST_UPDATED}</p>

        <p>
          This is a small, independently-run project, not a company with a
          legal department — but the commitments below are genuine, and this
          page is kept accurate to what the app actually does.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account information</strong> — your email, name, and
            profile picture, provided by Google when you sign in.
          </li>
          <li>
            <strong>The notes you write</strong> — text, dates, and any tags
            you set on them.
          </li>
          <li>
            <strong>Usage data</strong> — general page-view analytics via
            Google Analytics, to understand how the app is used. This does
            not include the content of your notes.
          </li>
          <li>
            <strong>Push notification data</strong> — if you turn on
            notifications, your browser gives us a subscription endpoint
            and encryption keys so we can deliver them. We can&apos;t read
            any other data through this, and it&apos;s deleted if you turn
            notifications off or delete your account.
          </li>
        </ul>

        <h2>Who can see your data</h2>
        <p>
          Your notes are visible only to you. Site administrators can see a
          list of registered users — email address and account role only —
          but cannot see the content of anyone&apos;s notes.
        </p>

        <h2>Where your data lives</h2>
        <p>Your data is processed and stored by a small number of services:</p>
        <ul>
          <li><strong>Auth0</strong> — handles sign-in</li>
          <li><strong>MongoDB Atlas</strong> — stores your account and notes</li>
          <li><strong>Heroku</strong> — hosts the application</li>
          <li><strong>Google Analytics</strong> — usage analytics</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          The app uses cookies for two purposes: keeping you signed in
          (via Auth0), and anonymous usage analytics (via Google Analytics).
        </p>

        <h2>How long we keep your data</h2>
        <p>
          Your notes are kept for as long as your account exists. You can
          delete individual notes at any time, or permanently delete your
          entire account and all associated data from your account settings.
          Account deletion cannot be undone.
        </p>

        <h2>Your rights</h2>
        <ul>
          <li>You can view all of your own data at any time within the app.</li>
          <li>
            You can permanently delete your account and every note you have
            written, at any time, from Settings.
          </li>
          <li>You can contact us with any questions or concerns.</li>
        </ul>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes in a meaningful way, the &quot;last
          updated&quot; date above will reflect it.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy or your data can be sent through{' '}
          <Link to="/contact">the contact form</Link>.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

import { useNavigate } from 'react-router-dom';
import { toLocalDateString } from '../../utils/date';
import './termsOfService.css';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="legalPage">
      <button className="legalBack" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="legalContent">
        <h1>Terms of Service</h1>
        <p className="legalUpdated">Last updated: {toLocalDateString(new Date())}</p>

        <p>
          This is a small, independently-run project. These terms are meant
          to be plain and genuinely followed, not legal boilerplate for its
          own sake.
        </p>

        <h2>The service</h2>
        <p>
          This app lets you keep a personal journal and track habits over
          time. It is provided as-is, and is currently in active
          development — features, and occasionally data structures, may
          change.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for keeping your Google account (used to sign
          in) secure. If you believe your account has been compromised,
          contact us right away.
        </p>

        <h2>Your content</h2>
        <p>
          You own everything you write. We do not claim any rights to your
          notes beyond what is necessary to store and display them back to
          you.
        </p>

        <h2>Acceptable use</h2>
        <p>Please do not use this app to:</p>
        <ul>
          <li>Store or share illegal content</li>
          <li>Attempt to access another user&apos;s data</li>
          <li>Attempt to disrupt or abuse the service (including its infrastructure)</li>
        </ul>

        <h2>Ending your account</h2>
        <p>
          You can permanently delete your account and all associated data at
          any time from Settings. We may also suspend or terminate accounts
          that violate the acceptable use terms above.
        </p>

        <h2>No warranty</h2>
        <p>
          This service is provided &quot;as is,&quot; without warranty of
          any kind. As a small, independently-run project, we cannot
          guarantee uninterrupted availability or that data will never be
          lost — though real effort goes into avoiding both.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, we are not liable for any
          indirect, incidental, or consequential damages arising from your
          use of this service.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          If these terms change in a meaningful way, the &quot;last
          updated&quot; date above will reflect it.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to{' '}
          <a href="mailto:lehreradam@yahoo.com">lehreradam@yahoo.com</a>.
        </p>
      </div>
    </div>
  );
};

export default TermsOfService;

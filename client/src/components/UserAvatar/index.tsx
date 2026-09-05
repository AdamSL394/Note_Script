import { useState } from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface UserAvatarProps {
  src: string | undefined;
  size: number;
  className?: string;
  id?: string;
}

/**
 * Renders the user's Auth0 profile picture, falling back to a generic
 * account icon if the image is missing or fails to load for any
 * reason -- a blocked CSP domain, a network hiccup, or an Auth0
 * connection type that doesn't supply a picture at all (e.g. a plain
 * email/password sign-up with no Gravatar match). Without this, a
 * failed avatar load previously left an empty/broken image with
 * nothing to recover it.
 */
export function UserAvatar(props: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeStyle = { height: `${props.size}px`, width: `${props.size}px` };

  if (!props.src || failed) {
    return (
      <AccountCircleIcon
        id={props.id}
        className={props.className}
        style={{ ...sizeStyle, color: 'var(--ns-graphite)', borderRadius: '50%' }}
        aria-label="User Profile"
      />
    );
  }

  return (
    <img
      id={props.id}
      className={props.className}
      style={sizeStyle}
      src={props.src}
      referrerPolicy="no-referrer"
      alt="User Profile"
      onError={() => setFailed(true)}
    />
  );
}

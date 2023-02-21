import React from 'react';
import Navbar from '../../components/Navbar/nav.js';
// import {useAuth0} from '@auth0/auth0-react';
import { UserSetting } from '../../components/UserSettings/userSettings.js';

function UserSettings() {
  // const {user} = useAuth0();
  return (
    <div>
      <Navbar></Navbar>
      <UserSetting></UserSetting>
    </div>
  );
}

export default UserSettings;

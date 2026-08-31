import Navbar from '../../components/Navbar/navbar';
import { UserSetting } from '../../components/UserSettings/userSettings';

function UserSettings() {
  return (
    <div>
      <Navbar></Navbar>
      <UserSetting></UserSetting>
    </div>
  );
}

export default UserSettings;
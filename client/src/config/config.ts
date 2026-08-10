import config from './config.json';
const enviroment = process.env.REACT_APP_HOST || 'production';
const enviromentAPI = config[enviroment];
export default enviromentAPI;


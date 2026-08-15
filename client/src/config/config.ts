import config from './config.json';

// `resolveJsonModule` means TS already knows config.json's exact shape
// from the file itself — `keyof typeof config` gives the real union of
// environment keys ('local' | 'staging' | 'development' | 'production')
// automatically, rather than needing a hand-written interface that could
// drift out of sync with the actual file.
const enviroment = (process.env.REACT_APP_HOST || 'production') as keyof typeof config;
const enviromentAPI = config[enviroment];
export default enviromentAPI;
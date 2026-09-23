// Matches "mongodb://" or "mongodb+srv://" followed by userinfo
// (anything up to the next @, excluding / and whitespace so it
// doesn't over-match into the host/path) followed by "@". The host
// itself is left intact -- it's not sensitive, and is already logged
// separately on a successful connection.
const MONGO_CREDENTIALS_PATTERN = /(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/gi;

export function redactMongoCredentials(text: string): string {
    return text.replace(MONGO_CREDENTIALS_PATTERN, '$1[REDACTED]@');
}

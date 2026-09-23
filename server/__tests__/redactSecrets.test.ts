import { redactMongoCredentials } from '../utils/redactSecrets';

describe('redactMongoCredentials', () => {
    it('redacts credentials from a mongodb:// URI', () => {
        const input = 'Failed to parse mongodb://myuser:mypass123@cluster0.abcde.mongodb.net/mydb';
        const result = redactMongoCredentials(input);
        expect(result).not.toContain('myuser');
        expect(result).not.toContain('mypass123');
        expect(result).toContain('mongodb://[REDACTED]@cluster0.abcde.mongodb.net/mydb');
    });

    it('redacts credentials from a mongodb+srv:// URI', () => {
        const input = 'connect ECONNREFUSED mongodb+srv://admin:s3cr3t@prod.xyz.mongodb.net';
        const result = redactMongoCredentials(input);
        expect(result).not.toContain('admin:s3cr3t');
        expect(result).toContain('mongodb+srv://[REDACTED]@prod.xyz.mongodb.net');
    });

    it('redacts credentials containing special characters', () => {
        const input = 'mongodb://user%40name:p%40ss!word@host.example.com/db';
        const result = redactMongoCredentials(input);
        expect(result).not.toContain('user%40name');
        expect(result).not.toContain('p%40ss!word');
        expect(result).toContain('[REDACTED]');
    });

    it('redacts every occurrence when a string contains multiple connection strings', () => {
        const input =
            'primary mongodb://a:b@host1.example.com failed, retrying mongodb://c:d@host2.example.com';
        const result = redactMongoCredentials(input);
        expect(result).not.toContain('a:b');
        expect(result).not.toContain('c:d');
        expect((result.match(/\[REDACTED\]/g) ?? []).length).toBe(2);
    });

    it('leaves the host intact', () => {
        const input = 'mongodb://user:pass@cluster0-shard-00-02.awkx9gw.mongodb.net';
        const result = redactMongoCredentials(input);
        expect(result).toContain('cluster0-shard-00-02.awkx9gw.mongodb.net');
    });

    it('leaves a string with no connection string untouched', () => {
        const input = 'Connection timed out after 30000ms';
        expect(redactMongoCredentials(input)).toBe(input);
    });

    it('does not affect a connection string with no credentials present', () => {
        const input = 'mongodb://localhost:27017/mydb';
        // No "@" at all here -- nothing for the pattern to match, and
        // the string should pass through completely unchanged.
        expect(redactMongoCredentials(input)).toBe(input);
    });
});

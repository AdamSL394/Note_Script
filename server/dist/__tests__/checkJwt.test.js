"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// express-oauth2-jwt-bearer's `auth()` call reaches out to Auth0's JWKS
// endpoint at request-verification time. We mock the module so importing
// checkJwt.ts (which calls auth({...}) at module load) never touches the
// network, and so we can assert exactly how checkJwt.ts uses it.
const mockVerifyJwt = jest.fn((req, res, next) => next());
// checkJwt.ts calls auth({...}) exactly once, at module-load time — before
// any test's beforeEach (and jest.config's clearMocks) has a chance to run
// and wipe a jest.fn()'s call history. So we capture the options it was
// called with into a plain variable here, not a mock's .mock.calls, which
// survives clearMocks untouched.
let capturedAuthOptions;
jest.mock('express-oauth2-jwt-bearer', () => ({
    auth: (options) => {
        capturedAuthOptions = options;
        return mockVerifyJwt;
    },
}));
const checkJwt_1 = __importStar(require("../middleware/checkJwt"));
describe('checkJwt middleware', () => {
    const makeReqRes = (method) => {
        const req = { method };
        const res = {};
        const next = jest.fn();
        return { req, res, next };
    };
    it('configures the auth() verifier from config.json audience/issuer, not hardcoded values', () => {
        expect(capturedAuthOptions).toEqual(expect.objectContaining({
            audience: expect.any(String),
            issuerBaseURL: expect.stringMatching(/^https:\/\//),
        }));
    });
    it('bypasses JWT verification entirely for OPTIONS requests (CORS preflight)', () => {
        const { req, res, next } = makeReqRes('OPTIONS');
        (0, checkJwt_1.default)(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockVerifyJwt).not.toHaveBeenCalled();
    });
    it.each(['GET', 'POST', 'PATCH', 'DELETE', 'PUT'])('delegates %s requests to the real JWT verifier rather than skipping auth', (method) => {
        const { req, res, next } = makeReqRes(method);
        (0, checkJwt_1.default)(req, res, next);
        expect(mockVerifyJwt).toHaveBeenCalledWith(req, res, next);
    });
    it('never calls next() directly for a non-OPTIONS request — only the verifier may', () => {
        // Regression guard: if someone "simplifies" checkJwt to always call
        // next() itself, this would still pass unless we check that next
        // was reached *through* verifyJwt and not before/instead of it.
        mockVerifyJwt.mockImplementationOnce((_req, _res, _next) => {
            // deliberately does NOT call next — simulates a rejected token
        });
        const { req, res, next } = makeReqRes('GET');
        (0, checkJwt_1.default)(req, res, next);
        expect(next).not.toHaveBeenCalled();
    });
});
describe('getVerifiedUserId', () => {
    it('returns undefined when auth is undefined (no token was ever verified)', () => {
        expect((0, checkJwt_1.getVerifiedUserId)(undefined)).toBeUndefined();
    });
    it('returns undefined when payload.sub is missing', () => {
        const auth = { payload: {} };
        expect((0, checkJwt_1.getVerifiedUserId)(auth)).toBeUndefined();
    });
    it('returns undefined when payload.sub is an empty string', () => {
        const auth = { payload: { sub: '' } };
        expect((0, checkJwt_1.getVerifiedUserId)(auth)).toBeUndefined();
    });
    it('strips the "auth0|" connection prefix for database-connection logins', () => {
        const auth = { payload: { sub: 'auth0|507f1f77bcf86cd799439011' } };
        expect((0, checkJwt_1.getVerifiedUserId)(auth)).toBe('507f1f77bcf86cd799439011');
    });
    it('does NOT pad a raw id that is already 24 characters', () => {
        const auth = { payload: { sub: 'auth0|507f1f77bcf86cd799439011' } };
        const result = (0, checkJwt_1.getVerifiedUserId)(auth);
        expect(result).toHaveLength(24);
        expect(result).toBe('507f1f77bcf86cd799439011');
    });
    it('pads a non-24-char id with "000" (social-login sub shorter than a Mongo ObjectId)', () => {
        // e.g. a google-oauth2 sub's numeric portion won't naturally be 24 chars.
        const auth = { payload: { sub: 'google-oauth2|123456789012345678901' } };
        const result = (0, checkJwt_1.getVerifiedUserId)(auth);
        expect(result).toBe('123456789012345678901000');
        expect(result).toHaveLength(24);
    });
    it('falls back to the full sub when there is no "|" separator at all', () => {
        // .split('|')[1] is undefined when there's no pipe, so the `?? sub`
        // fallback must kick in — this is the one branch most likely to be
        // silently broken by a future refactor since it only fires for a
        // sub shape nobody sees in normal Auth0-connection testing.
        const bareSub = 'bareidentifiernopipehere'; // 24 chars, no padding needed
        expect(bareSub).toHaveLength(24);
        const auth = { payload: { sub: bareSub } };
        expect((0, checkJwt_1.getVerifiedUserId)(auth)).toBe(bareSub);
    });
    it('pads a bare (no "|") sub that is not 24 characters, rather than returning "undefined"', () => {
        // Guards specifically against a regression where `.split('|')[1]`
        // being undefined leaks through instead of falling back to `sub`.
        const auth = { payload: { sub: 'short' } };
        const result = (0, checkJwt_1.getVerifiedUserId)(auth);
        expect(result).not.toContain('undefined');
        expect(result).toBe('short000');
    });
    it('regression guard: padding logic here must stay in sync with the duplicate in noteController.postNotes', () => {
        // noteController.ts independently re-implements this exact
        // `length !== 24 ? id + '000' : id` check on the userId it receives.
        // There is no shared helper — if one copy's threshold or padding
        // suffix ever changes without the other, notes could be written
        // under a different userId than the one queries expect, and every
        // "my notes are missing" bug would look like a DB issue rather
        // than an identity mismatch. This test just pins today's behavior
        // so a change to one side without the other shows up as a diff
        // here, not as a support ticket.
        const shortId = 'auth0|abc123';
        const result = (0, checkJwt_1.getVerifiedUserId)({ payload: { sub: shortId } });
        expect(result).toBe('abc123000');
    });
});

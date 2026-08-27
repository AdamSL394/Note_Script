"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const errorHandler_1 = require("./middleware/errorHandler");
const path_1 = __importDefault(require("path"));
const notes_1 = __importDefault(require("./routes/notes"));
const userSettings_1 = __importDefault(require("./routes/userSettings"));
const body_parser_1 = __importDefault(require("body-parser"));
const db_1 = __importDefault(require("./database/db"));
const checkJwt_1 = __importDefault(require("./middleware/checkJwt"));
const config_json_1 = __importDefault(require("./config/config.json"));
const app = (0, express_1.default)();
const environment = (process.env.NODE_ENV || 'production');
const environmentCreds = config_json_1.default[environment];
async function main() {
    try {
        await (0, db_1.default)(process.env.MONGODB_URI || environmentCreds.mongodb);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
main();
app.use((0, helmet_1.default)());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
app.use('/notes', checkJwt_1.default, notes_1.default);
app.use('/api/users', checkJwt_1.default, userSettings_1.default);
if (process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'production') {
    const root = path_1.default.join(__dirname, '..', '..', 'client', 'build');
    app.use(express_1.default.static(root));
    app.get('*', function (req, res) {
        res.sendFile('index.html', { root });
    });
}
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});

const httpContext = require("express-http-context");
const postgresDB = require("../drivers/PostgresDB");
const surveyDB = require("../db/SurveyDB");
const tokenDB = require("../db/TokenDB");
const queryConvert = require("../utils/QueryConverter");
const Exception = require("../utils/Exception");
const {DebugLogger} = require("../utils/Logger");

const log = DebugLogger("src/service/TokenService.js");

class TokenService {
    constructor() {
        this.createToken = this.createToken.bind(this);
    }

    async createToken(req, res) {
        httpContext.set("method", "createToken");
        const {amount, survey_id} = req.body;
        const user_id = req.user.id;
        try {
            await postgresDB.begin();
            const surveys = queryConvert(await surveyDB.getSurveyByIdAndUserId(survey_id, user_id));
            if (surveys.length > 0) {
                const createdTokens = [];
                for (let i = 0; i < Number(amount); i++) {
                    createdTokens.push(await tokenDB.createToken(survey_id));
                }
                await postgresDB.commit();

                const ret = [];
                for (let i = 0; i < createdTokens.length; i++) {
                    const result = queryConvert(createdTokens[i])[0];
                    ret.push(result);
                }
                return res.status(201).json(ret);
            }
            await postgresDB.rollback()
            return Exception(403, "No survey found for this user id and survey id").send(res);

        } catch (e) {
            log.error(e.message);
            await postgresDB.rollback();
            return Exception(500, "An unexpected error happened. Please try again.", e.message).send(res);
        }
    }
}

const tokenService = new TokenService();

module.exports = tokenService;
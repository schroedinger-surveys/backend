import AbstractSqlDB from "./AbstractSqlDB";

class SurveyDB extends AbstractSqlDB {
    updateSurvey = (survey_id, user_id, new_title, new_description, new_start_date, new_end_date, new_secured) => {
        return this.query(`
                    UPDATE surveys
                    SET title       = $1,
                        description = $2,
                        start_date  = $3,
                        end_date    = $4,
                        secured     = $5
                    WHERE id = $6::uuid
                      AND id in (SELECT surveys.id
                                 FROM surveys,
                                      users
                                 WHERE surveys.user_id = users.id
                                   AND users.id = $7::uuid);

            `,
            [new_title, new_description, new_start_date, new_end_date, new_secured, survey_id.split("-").join(""), user_id.split("-").join("")]
        );
    }

    deleteSurvey = (id, userId) => {
        return this.query(
            "DELETE FROM surveys WHERE id IN (SELECT surveys.id FROM surveys, users WHERE surveys.user_id = users.id AND surveys.id = $1 AND users.id = $2)",
            [id.split("-").join(""), userId.split("-").join("")]
        );
    }

    createSurvey = (title, description, startDate, endDate, secured, userId) => {
        return this.query(
            "INSERT INTO surveys(title, description, start_date, end_date, secured, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [title, description, startDate, endDate, secured, userId.split("-").join("")]
        );
    }

    getSurveyByIdAndUserId = (id, userId) => {
        return this.query(
            "SELECT * FROM surveys where id = $1 AND user_id = $2",
            [id.split("-").join(""), userId.split("-").join("")]
        );
    }

    getSurveyById = async (id) => {
        let jsons = await this.query(
                `SELECT json_build_object(
                                'id', s.id,
                                'title', s.title,
                                'user_id', s.user_id,
                                'description', s.description,
                                'start_date', s.start_date,
                                'end_date', s.end_date,
                                'secured', s.secured,
                                'constrained_questions', (SELECT json_agg(
                                                                         json_build_object(
                                                                                 'id', cq.id,
                                                                                 'question_text', cq.question_text,
                                                                                 'position', cq.position,
                                                                                 'options', (SELECT json_agg(
                                                                                                            json_build_object(
                                                                                                                    'id',
                                                                                                                    cqo.id,
                                                                                                                    'answer',
                                                                                                                    cqo.answer,
                                                                                                                    'position',
                                                                                                                    cqo.position
                                                                                                                )
                                                                                                        )
                                                                                             FROM constrained_questions_options cqo
                                                                                             WHERE cq.id = cqo.constrained_question_id
                                                                                 )
                                                                             )
                                                                     )
                                                          FROM constrained_questions cq
                                                          WHERE cq.survey_id = s.id),
                                'freestyle_questions', (SELECT json_agg(
                                                                       json_build_object(
                                                                               'id', fq.id,
                                                                               'question_text', fq.question_text,
                                                                               'position', fq.position
                                                                           )
                                                                   )
                                                        FROM freestyle_questions fq
                                                        WHERE fq.survey_id = s.id
                                )
                            ) AS result
                 FROM surveys s
                 WHERE s.id = $1
                 GROUP BY s.id;
            `,
            [id.split("-").join("")]
        );
        if (jsons.length === 1) {
            jsons = [jsons[0].result];
        }
        for(const json of jsons){
            if (json.constrained_questions === null) {
                json.constrained_questions = [];
            }
            if (json.freestyle_questions === null) {
                json.freestyle_questions = [];
            }
        }
        return jsons;
    }

    searchSurveys = async (user_id, title, description, secured: boolean, startDate, endDate, pageNumber, pageSize) => {
        let user_id_formatted = user_id;
        if (user_id_formatted) {
            user_id_formatted = user_id_formatted.split("-").join("");
        }
        let title_formatted = title;
        if (title_formatted) {
            title_formatted = `%${title_formatted}%`;
        }
        let description_formatted = description;
        if (description_formatted) {
            description_formatted = `%${description_formatted}%`;
        }
        const jsons = await this.query(`
                            WITH args (user_id, title, description, secured, start_date, end_date) as (VALUES ($1, $2, $3, $4, CAST($5 as Date), CAST($6 as Date)))
                            SELECT json_build_object(
                                'id', s.id,
                                'title', s.title,
                                'user_id', s.user_id,
                                'description', s.description,
                                'start_date', s.start_date,
                                'end_date', s.end_date,
                                'secured', s.secured,
                                'constrained_questions', (SELECT json_agg(
                                                                         json_build_object(
                                                                                 'id', cq.id,
                                                                                 'question_text', cq.question_text,
                                                                                 'position', cq.position,
                                                                                 'options', (SELECT json_agg(
                                                                                                            json_build_object(
                                                                                                                    'id', cqo.id,
                                                                                                                    'answer', cqo.answer,
                                                                                                                    'position', cqo.position
                                                                                                                )
                                                                                                        )
                                                                                             FROM constrained_questions_options cqo
                                                                                             WHERE cq.id = cqo.constrained_question_id
                                                                                 )
                                                                             )
                                                                     )
                                                          FROM constrained_questions cq
                                                          WHERE cq.survey_id = s.id),
                                'freestyle_questions', (SELECT json_agg(
                                                                       json_build_object(
                                                                               'id', fq.id,
                                                                               'question_text', fq.question_text,
                                                                               'position', fq.position
                                                                           )
                                                                   )
                                                        FROM freestyle_questions fq
                                                        WHERE fq.survey_id = s.id
                                )
                            ) AS result
                             FROM surveys s, args
                             WHERE (args.secured IS NULL OR s.secured = args.secured::boolean)
                             AND (args.user_id IS NULL OR s.user_id = args.user_id::uuid) 
                             AND (args.title IS NULL OR s.title LIKE args.title) 
                             AND (args.start_date IS NULL OR s.start_date > args.start_date)
                             AND (args.end_date IS NULL OR s.end_date < args.start_date) 
                             GROUP BY s.id
                             ORDER BY s.created DESC OFFSET $7 LIMIT $8`,
            [user_id_formatted, title_formatted, description_formatted, secured, startDate, endDate, pageNumber * pageSize, pageSize]
        );
        const ret = [];
        for (const json of jsons) {
            ret.push(json.result);
        }
        for (const json of ret) {
            if (json.constrained_questions === null) {
                json.constrained_questions = [];
            }
            if (json.freestyle_questions === null) {
                json.freestyle_questions = [];
            }
        }
        return ret;
    }

    countSurveys = (user_id, title, description, secured: boolean, startDate, endDate) => {
        let user_id_formatted = user_id;
        if (user_id_formatted) {
            user_id_formatted = user_id_formatted.split("-").join("");
        }
        let title_formatted = title;
        if (title_formatted) {
            title_formatted = `%${title_formatted}%`;
        }
        let description_formatted = description;
        if (description_formatted) {
            description_formatted = `%${description_formatted}%`;
        }
        return this.query(`WITH args (user_id, title, description, secured, start_date, end_date) as (VALUES ($1, $2, $3, $4, CAST($5 as Date), CAST($6 as Date)))
            SELECT count(surveys.id)::integer FROM surveys, args
            WHERE (surveys.secured = args.secured::boolean)
            AND (args.user_id IS NULL OR surveys.user_id = args.user_id::uuid) 
            AND (args.title IS NULL OR surveys.title LIKE args.title) 
            AND (args.start_date IS NULL OR surveys.start_date > args.start_date)
            AND (args.end_date IS NULL OR surveys.end_date < args.start_date);`,
            [user_id_formatted, title_formatted, description_formatted, secured, startDate, endDate]
        );
    }
}

const surveyDB = new SurveyDB();
export default surveyDB;
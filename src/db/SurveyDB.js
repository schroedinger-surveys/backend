const postgresDB = require("./PostgresDB");

class SurveyDB {
    createSurvey(title, description, startDate, endDate, secured, userId) {
        const insertSurvey = {
            name: "create-survey",
            text: "INSERT INTO surveys(title, description, start_date, end_date, secured, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            values: [title, description, startDate, endDate, secured, userId.split("-").join("")]
        };
        return postgresDB.query(insertSurvey);
    }

    getSurvey(id) {
        const selectQuery = {
            rowMode: "array",
            name: "get-survey",
            text: "SELECT * FROM surveys where id = $1",
            values: [id.split("-").join("")]
        };
        return postgresDB.query(selectQuery);
    }

    searchPublicSurveys(title, startDate, endDate, pageNumber, pageSize) {
        const selectQuery = {
            rowMode: "array",
            name: "search-public-survey",
            text: `WITH args (title, start_date, end_date) as (VALUES ($1, CAST($2 as Date), CAST($3 as Date)))
            SELECT surveys.id FROM surveys, args
            WHERE (surveys.secured is false)
            AND (args.title IS NULL OR surveys.title LIKE args.title) 
            AND (args.start_date IS NULL OR surveys.start_date > args.start_date)
            AND (args.end_date IS NULL OR surveys.end_date < args.start_date) 
            ORDER BY id DESC OFFSET $4  LIMIT $5;`,
            values: [title, startDate, endDate, pageNumber * pageSize, pageSize]
        };
        return postgresDB.query(selectQuery);
    }

    countPublicSurveys(title, startDate, endDate) {
        const selectQuery = {
            rowMode: "array",
            name: "count-public-survey",
            text: `WITH args (title, start_date, end_date) as (VALUES ($1, CAST($2 as Date), CAST($3 as Date)))
            SELECT count(surveys.id)::integer FROM surveys, args
            WHERE (surveys.secured is false)
            AND (args.title IS NULL OR surveys.title LIKE args.title) 
            AND (args.start_date IS NULL OR surveys.start_date > args.start_date)
            AND (args.end_date IS NULL OR surveys.end_date < args.start_date);`,
            values: [title, startDate, endDate]
        };
        return postgresDB.query(selectQuery);
    }


    searchSecuredSurveys(title, startDate, endDate, pageNumber, pageSize, userId) {
        const values = [title, startDate, endDate, userId.split("-").join(""), pageNumber * pageSize, pageSize];
        const selectQuery = {
            rowMode: "array",
            name: "search-secured-survey",
            text: `WITH args (title, start_date, end_date) as (VALUES ($1, CAST($2 as Date), CAST($3 as Date)))
            SELECT surveys.id FROM surveys, args, users 
            WHERE users.id = $4
            AND surveys.user_id = users.id
            AND (surveys.secured is true)
            AND (args.title IS NULL OR surveys.title LIKE args.title) 
            AND (args.start_date IS NULL OR surveys.start_date > args.start_date)
            AND (args.end_date IS NULL OR surveys.end_date < args.start_date)
            ORDER BY surveys.id DESC OFFSET $5 LIMIT $6;`,
            values: values
        };
        return postgresDB.query(selectQuery);
    }

    countSecuredSurveys(title, startDate, endDate, userId) {
        const selectQuery = {
            rowMode: "array",
            name: "count-secured-survey",
            text: `WITH args (title, start_date, end_date) as (VALUES ($1, CAST($2 as Date), CAST($3 as Date)))
            SELECT count(surveys.id)::integer FROM surveys, args, users 
            WHERE users.id = $4
            AND surveys.user_id = users.id
            AND (surveys.secured is true)
            AND (args.title IS NULL OR surveys.title LIKE args.title) 
            AND (args.start_date IS NULL OR surveys.start_date > args.start_date)
            AND (args.end_date IS NULL OR surveys.end_date < args.start_date);`,
            values: [title, startDate, endDate, userId.split("-").join("")]
        };
        return postgresDB.query(selectQuery);
    }
}

const surveyDB = new SurveyDB();
module.exports = surveyDB;
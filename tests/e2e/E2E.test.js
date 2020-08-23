require("dotenv-flow").config({
    silent: true
});
const {afterAll, describe, test, expect} = require("@jest/globals");
const app = require("../../app");
const supertest = require("supertest");
const {v4: uuidv4} = require("uuid");
const request = supertest(app);
const jwt = require("jsonwebtoken");
const SECRET = process.env.SECRET;

describe("Test backend on typical scenario", () => {
    test("Typical usage of backend", async (done) => {
        const health1 = await request.get("/health").send();
        expect(health1.status).toBe(200);

        const user1 = uuidv4();
        const user2 = uuidv4();
        const user3 = uuidv4();
        const password = uuidv4();

        const register1 = await request.post("/user").send({
            "username": user1,
            "password": password,
            "email": `${user1}@email.com`
        });
        expect(register1.status).toBe(201);

        const login1 = await request.post("/user/login").send({
            "username": user1,
            "password": password
        });
        expect(login1.status).toBe(200);
        expect(login1.body.hasOwnProperty("jwt")).toBe(true);
        let jwt1 = login1.body.jwt;
        expect(jwt1.split(".").length).toEqual(3);
        const jwtBody1 = jwt.verify(jwt1, SECRET);
        expect(jwtBody1.hasOwnProperty("id")).toBe(true);
        expect(jwtBody1.hasOwnProperty("username")).toBe(true);
        expect(jwtBody1.hasOwnProperty("exp")).toBe(true);
        expect(jwtBody1.hasOwnProperty("iat")).toBe(true);
        expect(jwtBody1.hasOwnProperty("salt")).toBe(true);
        expect(Object.keys(jwtBody1).length).toBe(5);

        const info1 = await request.post("/user/info")
            .set("authorization", jwt1)
            .send();
        expect(info1.status).toBe(200);

        expect(info1.body.hasOwnProperty("id")).toBe(true);
        expect(info1.body.hasOwnProperty("username")).toBe(true);
        expect(info1.body.hasOwnProperty("email")).toBe(true);
        expect(info1.body.hasOwnProperty("created")).toBe(true);
        expect(info1.body.username).toEqual(user1);
        expect(info1.body.email).toEqual(`${user1}@email.com`);

        expect(Object.keys(jwtBody1).length).toBe(5);

        const logout1 = await request.post("/user/logout")
            .set("authorization", jwt1)
            .send();
        expect(logout1.status).toBe(204);

        const infoInvalid = await request.post("/user/info")
            .set("authorization", jwt1)
            .send();
        expect(infoInvalid.status).toBe(403);

        const login1_1 = await request.post("/user/login").send({
            "username": user1,
            "password": password
        });
        expect(login1_1.status).toBe(200);
        expect(login1_1.body.hasOwnProperty("jwt")).toBe(true);
        jwt1 = login1_1.body.jwt;

        const invalidRegister1 = await request.post("/user").send({
            "username": user2,
            "password": password,
            "email": `${user1}@email.com`
        });
        expect(invalidRegister1.status).toBe(409);

        const invalidRegister2 = await request.post("/user").send({
            "username": user1,
            "password": password,
            "email": `${user2}@email.com`
        });
        expect(invalidRegister2.status).toBe(409);

        const invalidRegister3 = await request.post("/user").send({
            "username": user1,
            "password": password
        });
        expect(invalidRegister3.status).toBe(422);

        const register2 = await request.post("/user").send({
            "username": user2,
            "password": password,
            "email": `${user2}@email.com`
        });
        expect(register2.status).toBe(201);

        const login2 = await request.post("/user/login").send({
            "username": user2,
            "password": password
        });
        expect(login2.status).toBe(200);
        const jwt2 = login2.body.jwt;

        const register3 = await request.post("/user").send({
            "username": user3,
            "password": password,
            "email": `${user3}@email.com`
        });
        expect(register3.status).toBe(201);

        const login3 = await request.post("/user/login").send({
            "username": user3,
            "password": password
        });
        expect(login3.status).toBe(200);
        const jwt3 = login3.body.jwt;

        const unsecuredSurvey1 = randomSurvey(false);
        const createdSurvey1 = await request
            .post("/survey")
            .send(unsecuredSurvey1)
            .set("authorization", jwt1);
        expect(createdSurvey1.status).toEqual(201);

        const searchSurvey1 = await request
            .get(`/survey/public?title=${unsecuredSurvey1.title}`);
        expect(searchSurvey1.status).toEqual(200);
        expect(searchSurvey1.body.length).toEqual(1);
        expect(searchSurvey1.body[0].hasOwnProperty("id")).toBe(true);
        expect(searchSurvey1.body[0].title).toEqual(unsecuredSurvey1.title);
        expect(searchSurvey1.body[0].description).toEqual(unsecuredSurvey1.description);
        expect(searchSurvey1.body[0].hasOwnProperty("start_date")).toBe(true);
        expect(searchSurvey1.body[0].hasOwnProperty("end_date")).toBe(true);
        expect(searchSurvey1.body[0].secured).toEqual(unsecuredSurvey1.secured);
        expect(searchSurvey1.body[0].freestyle_questions.length).toEqual(unsecuredSurvey1.freestyle_questions.length);
        expect(searchSurvey1.body[0].constrained_questions.length).toEqual(unsecuredSurvey1.constrained_questions.length);
        expect(searchSurvey1.body[0].user_id).toEqual(info1.body.id);
        searchSurvey1.body[0].freestyle_questions;
        for(const f1 of searchSurvey1.body[0].freestyle_questions){
            let found = false;
            for(const f2 of unsecuredSurvey1.freestyle_questions){
                if(f2.question_text === f1.question_text && f2.position === f1.position){
                    found = true;
                    break;
                }
            }
            expect(found).toBe(true);
        }
        for(const f1 of searchSurvey1.body[0].constrained_questions){
            let found = false;
            for(const f2 of unsecuredSurvey1.constrained_questions){
                if(f2.question_text === f1.question_text && f2.position === f1.position){
                    for(const q1 of f1.options){
                        for(const q2 of f2.options){
                            if(q1.answer === q2.answer && q1.position === q2.position){
                                found = true;
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            expect(found).toBe(true);
        }

        const submission1 = {
            "survey_id": createdSurvey1.body.id,
            "constrained_answers": [
                {
                    "constrained_question_id": createdSurvey1.body.constrained_questions[0].id,
                    "constrained_questions_option_id": createdSurvey1.body.constrained_questions[0].options[1].id
                },
                {
                    "constrained_question_id": createdSurvey1.body.constrained_questions[1].id,
                    "constrained_questions_option_id": createdSurvey1.body.constrained_questions[1].options[1].id
                }
            ],
            "freestyle_answers": [
                {
                    "freestyle_question_id": createdSurvey1.body.freestyle_questions[0].id,
                    "answer": uuidv4()
                }
            ]
        };
        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post("/submission")
                .send(submission1);
            expect(createdSubmission1.status).toEqual(201);
        }
        const countSubmission1 = await request
            .get(`/submission/count?survey_id=${createdSurvey1.body.id}`)
            .set("authorization", jwt1);
        expect(countSubmission1.status).toEqual(200);
        expect(countSubmission1.body.count).toEqual(10);

        const countSubmission2 = await request
            .get(`/submission/count?survey_id=${createdSurvey1.body.id}`)
            .set("authorization", jwt2);
        expect(countSubmission2.status).toEqual(200);
        expect(countSubmission2.body.count).toEqual(0);

        const countSubmission3 = await request
            .get(`/submission/count?survey_id=${createdSurvey1.body.id}`)
            .set("authorization", jwt3);
        expect(countSubmission3.status).toEqual(200);
        expect(countSubmission3.body.count).toEqual(0);

        const getSubmission1 = await request
            .get(`/submission?survey_id=${createdSurvey1.body.id}&page_size=10`)
            .set("authorization", jwt1);
        expect(getSubmission1.status).toEqual(200);
        expect(getSubmission1.body.length).toEqual(10);
        for(const sub of getSubmission1.body){
            expect(sub.survey_id).toEqual(createdSurvey1.body.id);
            expect(sub.constrained_answers.length).toEqual(submission1.constrained_answers.length);
            expect(sub.freestyle_answers.length).toEqual(submission1.freestyle_answers.length);
            for(const sa1 of sub.constrained_answers){
                let found = false;
                for(const sa2 of submission1.constrained_answers){
                    if(sa1.constrained_question_id === sa2.constrained_question_id && sa1.constrained_questions_option_id === sa2.constrained_questions_option_id){
                        found = true;
                        break;
                    }
                }
                expect(found).toEqual(true);
            }
            for(const fa1 of sub.constrained_answers){
                let found = false;
                for(const fa2 of submission1.constrained_answers){
                    if(fa1.freestyle_question_id === fa2.freestyle_question_id && fa1.answer === fa2.answer){
                        found = true;
                        break;
                    }
                }
                expect(found).toEqual(true);
            }
        }

        const getSubmission2 = await request
            .get(`/submission?survey_id=${createdSurvey1.body.id}&page_size=10`)
            .set("authorization", jwt2);
        expect(getSubmission2.status).toEqual(200);
        expect(getSubmission2.body.length).toEqual(0);

        const getSubmission3 = await request
            .get(`/submission?survey_id=${createdSurvey1.body.id}&page_size=10`)
            .set("authorization", jwt2);
        expect(getSubmission3.status).toEqual(200);
        expect(getSubmission3.body.length).toEqual(0);


        const securedSurvey2 = randomSurvey(true);
        const createdSurvey2 = await request
            .post("/survey")
            .send(securedSurvey2)
            .set("authorization", jwt1);
        expect(createdSurvey2.status).toEqual(201);

        const searchSurvey2 = await request
            .get(`/survey/public?title=${securedSurvey2.title}`);
        expect(searchSurvey2.status).toEqual(200);
        expect(searchSurvey2.body.length).toEqual(0);

        const countSurvey2 = await request
            .get(`/survey/public/count?title=${securedSurvey2.title}`);
        expect(countSurvey2.status).toEqual(200);
        expect(countSurvey2.body.count).toEqual(0);

        const searchSurvey3 = await request
            .get(`/survey/secured?title=${securedSurvey2.title}`)
            .set("authorization", jwt1);
        expect(searchSurvey3.status).toEqual(200);
        expect(searchSurvey3.body.length).toEqual(1);

        const countSurvey3 = await request
            .get(`/survey/secured/count?title=${securedSurvey2.title}`)
            .set("authorization", jwt1);
        expect(countSurvey3.status).toEqual(200);
        expect(countSurvey3.body.count).toEqual(1);

        const searchSurvey4 = await request
            .get(`/survey/secured?title=${securedSurvey2.title}`)
            .set("authorization", jwt2);
        expect(searchSurvey4.status).toEqual(200);
        expect(searchSurvey4.body.length).toEqual(0);

        const countSurvey4 = await request
            .get(`/survey/secured/count?title=${securedSurvey2.title}`)
            .set("authorization", jwt2);
        expect(countSurvey4.status).toEqual(200);
        expect(countSurvey4.body.count).toEqual(0);

        const submission2 = {
            "survey_id": createdSurvey2.body.id,
            "constrained_answers": [
                {
                    "constrained_question_id": createdSurvey2.body.constrained_questions[0].id,
                    "constrained_questions_option_id": createdSurvey2.body.constrained_questions[0].options[1].id
                },
                {
                    "constrained_question_id": createdSurvey2.body.constrained_questions[1].id,
                    "constrained_questions_option_id": createdSurvey2.body.constrained_questions[1].options[1].id
                }
            ],
            "freestyle_answers": [
                {
                    "freestyle_question_id": createdSurvey2.body.freestyle_questions[0].id,
                    "answer": uuidv4()
                }
            ]
        };

        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post("/submission")
                .send(submission2);
            expect(createdSubmission1.status).toEqual(403);
        }
        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post("/submission")
                .set("authorization", jwt1)
                .send(submission2);
            expect(createdSubmission1.status).toEqual(201);
        }
        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post("/submission")
                .set("authorization", jwt2)
                .send(submission2);
            expect(createdSubmission1.status).toEqual(403);
        }
        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post("/submission")
                .set("authorization", jwt3)
                .send(submission2);
            expect(createdSubmission1.status).toEqual(403);
        }

        const createdTokens1 = await request
            .post("/token")
            .send({survey_id: createdSurvey2.body.id, amount: 10})
            .set("authorization", jwt1);
        expect(createdTokens1.status).toEqual(201);
        expect(createdTokens1.body.length).toEqual(10);

        const createdTokens2 = await request
            .post("/token")
            .send({survey_id: createdSurvey2.body.id, amount: 10})
            .set("authorization", jwt2);
        expect(createdTokens2.status).toEqual(403);

        const createdTokens3 = await request
            .post("/token")
            .send({survey_id: createdSurvey2.body.id, amount: 10})
            .set("authorization", jwt3);
        expect(createdTokens3.status).toEqual(403);

        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post(`/submission?token=${createdTokens1.body[i].id}`)
                .send(submission2);
            expect(createdSubmission1.status).toEqual(201);
        }

        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post(`/submission?token=${createdTokens1.body[i].id}`)
                .send(submission2);
            expect(createdSubmission1.status).toEqual(403);
        }

        const getSubmission4 = await request
            .get(`/submission?survey_id=${createdSurvey2.body.id}&page_size=1000`)
            .set("authorization", jwt1);
        expect(getSubmission4.status).toEqual(200);
        expect(getSubmission4.body.length).toEqual(20);

        const getSubmission5 = await request
            .get(`/submission?survey_id=${createdSurvey2.body.id}&page_size=1000`)
            .set("authorization", jwt2);
        expect(getSubmission5.status).toEqual(200);
        expect(getSubmission5.body.length).toEqual(0);

        const getSubmission6 = await request
            .get(`/submission?survey_id=${createdSurvey2.body.id}&page_size=1000`)
            .set("authorization", jwt3);
        expect(getSubmission6.status).toEqual(200);
        expect(getSubmission6.body.length).toEqual(0);

        const createdSurvey3 = await request
            .post("/survey")
            .send(securedSurvey2)
            .set("authorization", jwt2);
        expect(createdSurvey3.status).toEqual(201);

        const createdTokens4 = await request
            .post("/token")
            .send({survey_id: createdSurvey3.body.id, amount: 10})
            .set("authorization", jwt2);
        expect(createdTokens2.status).toEqual(403);

        for(let i = 0; i < 10; i++) {
            const createdSubmission1 = await request
                .post(`/submission?token=${createdTokens4.body[i].id}`)
                .send(submission2);
            expect(createdSubmission1.status).toEqual(403);
        }

        done();
    });


    afterAll(async (done) => {
        await app.close();
        done();
    });
});

function randomSurvey(secured) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    return {
        "title": uuidv4(),
        "description": uuidv4(),
        "start_date": now,
        "end_date": in30Days,
        "secured": secured,
        "constrained_questions": [
            {
                "question_text": uuidv4(),
                "position": 1,
                "options": [
                    {
                        "answer": uuidv4(),
                        "position": 1
                    },
                    {
                        "answer": uuidv4(),
                        "position": 2
                    },
                    {
                        "answer": uuidv4(),
                        "position": 3
                    },
                    {
                        "answer": uuidv4(),
                        "position": 4
                    }
                ]
            },
            {
                "question_text": uuidv4(),
                "position": 2,
                "options": [
                    {
                        "answer": uuidv4(),
                        "position": 1
                    },
                    {
                        "answer": uuidv4(),
                        "position": 2
                    },
                    {
                        "answer": uuidv4(),
                        "position": 3
                    },
                    {
                        "answer": uuidv4(),
                        "position": 4
                    }
                ]
            }
        ],
        "freestyle_questions": [
            {
                "question_text": uuidv4(),
                "position": 3
            }
        ]
    }
}

require("dotenv-flow").config({
    silent: true
});
const {afterAll, afterEach, beforeEach, describe, test, expect} = require("@jest/globals");
const app = require("../../app");
const supertest = require("supertest");
const {v4: uuidv4} = require("uuid");
const postgresDB = require("../../src/db/PostgresDB");
const {utilLogin, utilRegister} = require("../utils");
const request = supertest(app);


describe("Tests for survey API", () => {
    beforeEach(async (done) => {
        await postgresDB.clearDatabase();
        done();
    });

    test("Create survey without token should fail", async (done) => {
        const createSurveyWithoutToken = await request.post("/survey");
        expect(createSurveyWithoutToken.status).toEqual(403);
        done();
    });

    test("Survey creation should validate request body", async (done) => {
        const registerUser = await utilRegister("test", "test@email.com", "test");
        expect(registerUser.status).toBe(201);

        const login = await utilLogin("test", "test");
        expect(login.status).toBe(200);

        const jwtToken = JSON.parse(login.text).jwt;
        const createSurvey1 = await request
            .post("/survey")
            .set("authorization", jwtToken);
        expect(createSurvey1.status).toEqual(422);


        const validPayload = {
            "title": "Experience when working with Schroedinger",
            "description": "The result of this survey is used to improve the user experience of this app",
            "secured": false,
            "constrained_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 1,
                    "options": [
                        {
                            "name": "Very much",
                            "position": 1
                        },
                        {
                            "name": "Not so",
                            "position": 2
                        }
                    ]
                }
            ],
            "freestyle_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 2
                }
            ]
        };
        const createSurvey2 = await request
            .post("/survey")
            .send(validPayload)
            .set("authorization", jwtToken);
        expect(createSurvey2.status).toEqual(201);
        const body = JSON.parse(createSurvey2.text);
        expect(body.title).toEqual(validPayload.title);
        expect(body.description).toEqual(validPayload.description);
        expect(body.secured).toEqual(validPayload.secured);
        expect(body.constrained_questions.length).toEqual(1);
        expect(body.freestyle_questions.length).toEqual(1);
        expect(body.freestyle_questions[0].title).toEqual(validPayload.freestyle_questions[0].title);
        expect(body.freestyle_questions[0].position).toEqual(validPayload.freestyle_questions[0].position);
        expect(body.constrained_questions[0].title).toEqual(validPayload.constrained_questions[0].title);
        expect(body.constrained_questions[0].position).toEqual(validPayload.constrained_questions[0].position);
        expect(body.constrained_questions[0].options.length).toEqual(validPayload.constrained_questions[0].options.length);
        expect(body.constrained_questions[0].options[0].name).toEqual(validPayload.constrained_questions[0].options[0].name);
        expect(body.constrained_questions[0].options[0].position).toEqual(validPayload.constrained_questions[0].options[0].position);
        expect(body.constrained_questions[0].options[1].name).toEqual(validPayload.constrained_questions[0].options[1].name);
        expect(body.constrained_questions[0].options[1].position).toEqual(validPayload.constrained_questions[0].options[1].position);

        const createSurvey3 = await request
            .post("/survey")
            .send({
                "title": "Experience when working with Schroedinger",
                "description": "The result of this survey is used to improve the user experience of this app",
                "secured": false,
                "constrained_questions": [],
                "freestyle_questions": []
            })
            .set("authorization", jwtToken);
        expect(createSurvey3.status).toEqual(201);


        const createSurvey4 = await request
            .post("/survey")
            .send({
                "title": "Experience when working with Schroedinger",
                "description": "The result of this survey is used to improve the user experience of this app",
                "secured": false,
                "constrained_questions": [
                    {
                        "title": "Do cats have fluffy fur?",
                        "options": [
                            {
                                "name": "Very much",
                                "position": 1
                            },
                            {
                                "name": "Not so",
                                "position": 2
                            }
                        ]
                    }
                ],
                "freestyle_questions": [
                    {
                        "title": "Do cats have fluffy fur?",
                        "position": 2
                    }
                ]
            })
            .set("authorization", jwtToken);
        expect(createSurvey4.status).toEqual(422);

        done();
    });

    test("Test search public surveys", async (done) => {
        const registerUser = await utilRegister("test", "test@email.com", "test");
        expect(registerUser.status).toBe(201);

        const login = await utilLogin("test", "test");
        expect(login.status).toBe(200);

        const jwtToken = JSON.parse(login.text).jwt;

        const validPayload = {
            "title": "Experience when working with Schroedinger",
            "description": "The result of this survey is used to improve the user experience of this app",
            "secured": false,
            "constrained_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 1,
                    "options": [
                        {
                            "name": "Very much",
                            "position": 1
                        },
                        {
                            "name": "Not so",
                            "position": 2
                        }
                    ]
                }
            ],
            "freestyle_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 2
                }
            ]
        };
        for(let i = 0; i < 20; i++) {
            const createdSurvey = await request
                .post("/survey")
                .send(validPayload)
                .set("authorization", jwtToken);
            expect(createdSurvey.status).toEqual(201);
        }

        const searchSurvey1 = await request.get("/survey/public");
        expect(JSON.parse(searchSurvey1.text).length).toEqual(5);

        const searchSurvey2 = await request.get("/survey/public?page_size=10");
        expect(JSON.parse(searchSurvey2.text).length).toEqual(10);



        const validPayload2 = {
            "title": "strangething",
            "description": "The result of this survey is used to improve the user experience of this app",
            "secured": false,
            "constrained_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 1,
                    "options": [
                        {
                            "name": "Very much",
                            "position": 1
                        },
                        {
                            "name": "Not so",
                            "position": 2
                        }
                    ]
                }
            ],
            "freestyle_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 2
                }
            ]
        };
        const createdSurvey = await request
            .post("/survey")
            .send(validPayload2)
            .set("authorization", jwtToken);
        expect(createdSurvey.status).toEqual(201);

        const searchSurvey3 = await request.get("/survey/public?page_size=10&title=strangething");
        expect(JSON.parse(searchSurvey3.text).length).toEqual(1);

        const countSurvey1 = await request.get("/survey/public/count?title=strangething");
        expect(JSON.parse(countSurvey1.text)[0].count).toEqual(1);

        const countSurvey2 = await request.get("/survey/public/count");
        expect(JSON.parse(countSurvey2.text)[0].count).toEqual(21);

        done();
    });


    test("Test search secured surveys", async (done) => {
        const registerUser = await utilRegister("test", "test@email.com", "test");
        expect(registerUser.status).toBe(201);

        const login = await utilLogin("test", "test");
        expect(login.status).toBe(200);

        const jwtToken = JSON.parse(login.text).jwt;

        const validPayload = {
            "title": "Experience when working with Schroedinger",
            "description": "The result of this survey is used to improve the user experience of this app",
            "secured": true,
            "constrained_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 1,
                    "options": [
                        {
                            "name": "Very much",
                            "position": 1
                        },
                        {
                            "name": "Not so",
                            "position": 2
                        }
                    ]
                }
            ],
            "freestyle_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 2
                }
            ]
        };
        for(let i = 0; i < 20; i++) {
            const createdSurvey = await request
                .post("/survey")
                .send(validPayload)
                .set("authorization", jwtToken);
            expect(createdSurvey.status).toEqual(201);
        }

        const searchSurvey1 = await request.get("/survey/secured").set("authorization", jwtToken);
        expect(JSON.parse(searchSurvey1.text).length).toEqual(5);

        const searchSurvey2 = await request.get("/survey/secured?page_size=10").set("authorization", jwtToken);
        expect(JSON.parse(searchSurvey2.text).length).toEqual(10);

        const validPayload2 = {
            "title": "strangething",
            "description": "The result of this survey is used to improve the user experience of this app",
            "secured": true,
            "constrained_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 1,
                    "options": [
                        {
                            "name": "Very much",
                            "position": 1
                        },
                        {
                            "name": "Not so",
                            "position": 2
                        }
                    ]
                }
            ],
            "freestyle_questions": [
                {
                    "title": "Do cats have fluffy fur?",
                    "position": 2
                }
            ]
        };
        const createdSurvey = await request
            .post("/survey")
            .send(validPayload2)
            .set("authorization", jwtToken);
        expect(createdSurvey.status).toEqual(201);

        const searchSurvey3 = await request.get("/survey/secured?page_size=10&title=strangething").set("authorization", jwtToken);
        expect(JSON.parse(searchSurvey3.text).length).toEqual(1);


        const searchSurvey4 = await request.get("/survey/public");
        expect(JSON.parse(searchSurvey4.text).length).toEqual(0);

        const countSurvey1 = await request.get("/survey/secured/count?title=strangething").set("authorization", jwtToken);
        expect(JSON.parse(countSurvey1.text)[0].count).toEqual(1);

        const countSurvey2 = await request.get("/survey/secured/count").set("authorization", jwtToken);
        expect(JSON.parse(countSurvey2.text)[0].count).toEqual(21);


        const registerUser1 = await utilRegister("test1", "tes1t@email.com", "test1");
        expect(registerUser1.status).toBe(201);

        const login1 = await utilLogin("test1", "test1");
        expect(login1.status).toBe(200);

        const jwtToken1 = JSON.parse(login1.text).jwt;

        const countSurvey3 = await request.get("/survey/secured/count").set("authorization", jwtToken1);
        expect(JSON.parse(countSurvey3.text)[0].count).toEqual(0);

        done();
    });

    afterEach(async (done) => {
        await postgresDB.clearDatabase();
        done();
    });

    afterAll(async (done) => {
        await app.close();
        done();
    });
});
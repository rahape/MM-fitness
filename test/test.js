var expect  = require('chai').expect;
var request = require('request');

describe("Root app route", () => {
    it('Should give access to login', function(done) {
        request('http://localhost:8080' , function(error, response, body) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });
});
describe("Login with test user", () => {
    it("Should be redirected to /home", function(done) {
        request.post("http://localhost:8080/login", {form: {username: "testbruger", password: "1234"}}, function(error, response, body) {
            expect(response.statusCode).to.equal(302);
            expect(body).have.string("/home");
            done();
        });
    });
    describe("After login", () => {
        it("Should have access to /program", (done) => {
            request.get("http://localhost:8080/program", function(error, response, body) {
                expect(response.statusCode).to.equal(200);
                done();
            });
        });
        it("Should be redirected if trying to reach /admin/dashboard", (done) => {
            request("http://localhost:8080/admin/dashboard", function(error, response, body) {
                done();
            });
        });
    });
});
"use strict";
const MatrixAction = require("../../lib/models/MatrixAction");

describe("MatrixAction", function() {
    it("should not highlight mentions to text without mentions", () => {
        let action = new MatrixAction("message", "Some text");
        action.formatMentions({
            "Some Person": "@foobar:localhost"
        });
        expect(action.text).toEqual("Some text");
        expect(action.htmlText).toBeUndefined();
    });
    it("should highlight a user", () => {
        let action = new MatrixAction(
            "message",
            "JCDenton, it's a bomb!",
            "JCDenton, it's a bomb!",
            null
        );
        action.formatMentions({
            "JCDenton": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("jc.denton, it's a bomb!");
        expect(action.htmlText).toEqual(
            "<a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">JCDenton</a>, it's a bomb!"
        );
    });
    it("should highlight a user, regardless of case", () => {
        let action = new MatrixAction(
            "message",
            "JCDenton, it's a bomb!",
            "JCDenton, it's a bomb!",
            null
        );
        action.formatMentions({
            "jcdenton": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("jc.denton, it's a bomb!");
        expect(action.htmlText).toEqual(
            "<a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">jcdenton</a>, it's a bomb!"
        );
    });
    it("should highlight a user, with plain text", () => {
        let action = new MatrixAction("message", "JCDenton, it's a bomb!");
        action.formatMentions({
            "JCDenton": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("jc.denton, it's a bomb!");
        expect(action.htmlText).toEqual(
            "<a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">JCDenton</a>, it's a bomb!"
        );
    });
    it("should highlight a user, with weird characters", () => {
        let action = new MatrixAction("message", "`||JCDenton[m], it's a bomb!");
        action.formatMentions({
            "`||JCDenton[m]": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("jc.denton, it's a bomb!");
        expect(action.htmlText).toEqual(
            "<a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">`||JCDenton[m]</a>, it's a bomb!"
        );
    });
    it("should highlight multiple users", () => {
        let action = new MatrixAction(
            "message",
            "JCDenton is sent to assassinate PaulDenton",
            "JCDenton is sent to assassinate PaulDenton",
            null
        );
        action.formatMentions({
            "JCDenton": "@jc.denton:unatco.gov",
            "PaulDenton": "@paul.denton:unatco.gov"
        });
        expect(action.text).toEqual("jc.denton is sent to assassinate paul.denton");
        expect(action.htmlText).toEqual(
            "<a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">JCDenton</a> is sent" +
            " to assassinate <a href=\"https://matrix.to/#/@paul.denton:unatco.gov\">PaulDenton</a>"
        );
    });
    it("should highlight multiple mentions of the same user", () => {
        let action = new MatrixAction(
            "message",
            "JCDenton, meet JCDenton",
            "JCDenton, meet JCDenton",
            null
        );
        action.formatMentions({
            "JCDenton": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("jc.denton, meet jc.denton");
        expect(action.htmlText).toEqual(
            "<a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">JCDenton</a>," +
            " meet <a href=\"https://matrix.to/#/@jc.denton:unatco.gov\">JCDenton</a>"
        );
    });
    it("should not highlight mentions in a URL with www.", () => {
        let action = new MatrixAction(
            "message",
            "Go to http://www.JCDenton.com",
            "Go to <a href='http://www.JCDenton.com'>my website</a>",
            null
        );
        action.formatMentions({
            "JCDenton": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("Go to http://www.JCDenton.com");
        expect(action.htmlText).toEqual(
            "Go to <a href='http://www.JCDenton.com'>my website</a>"
        );
    });
    it("should not highlight mentions in a URL with http://", () => {
        let action = new MatrixAction(
            "message",
            "Go to http://JCDenton.com",
            "Go to <a href='http://JCDenton.com'>my website</a>",
            null
        );
        action.formatMentions({
            "JCDenton": "@jc.denton:unatco.gov"
        });
        expect(action.text).toEqual("Go to http://JCDenton.com");
        expect(action.htmlText).toEqual(
            "Go to <a href='http://JCDenton.com'>my website</a>"
        );
    });
});

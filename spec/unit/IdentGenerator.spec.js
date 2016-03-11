"use strict";
var Promise = require("bluebird");
var test = require("../util/test");
var IdentGenerator = require("../../lib/irc/IdentGenerator.js");

describe("Username generation", function() {
    var identGenerator;
    var storeMock = {};
    var existingUsernames = {};
    var ircUser;

    var mkMatrixUser = function(uid) {
        return {
            userId: uid,
            getId: function() { return uid; }
        };
    };

    beforeEach(function() {
        test.log(this); // eslint-disable-line no-invalid-this
        existingUsernames = {};
        ircUser = {
            nick: "MyCrazyNick",
            server: {
                domain: "somedomain.com"
            },
            getUsername: function() {
                return this._uname;
            },
            getUserId: function() {},
            setUsername: function(u) {
                this._uname = u;
            }
        };
        storeMock.getIrcClientByUsername = function(domain, uname) {
            var obj;
            if (existingUsernames[uname]) {
                obj = {
                    getUserId: function() { return existingUsernames[uname]; }
                };
            }
            return Promise.resolve(obj);
        };
        storeMock.storeIrcClient = function() {
            return Promise.resolve();
        };

        identGenerator = new IdentGenerator(storeMock);
        IdentGenerator.MAX_USER_NAME_LENGTH = 8;
    });

    it("should attempt a truncated user ID on a long user ID", function(done) {
        var userId = "@myreallylonguseridhere:localhost";
        var uname = "myreally";
        identGenerator.getIrcNames(ircUser, mkMatrixUser(userId)).done(function(info) {
            expect(info.username).toEqual(uname);
            done();
        });
    });

    it("should start with '_1' on an occupied user ID", function(done) {
        var userId = "@myreallylonguseridhere:localhost";
        var uname = "myreal_1";
        existingUsernames.myreally = "@someone:else";
        identGenerator.getIrcNames(ircUser, mkMatrixUser(userId)).done(function(info) {
            expect(info.username).toEqual(uname);
            done();
        });
    });

    it("should loop from '_9' to '_10' and keep the same total length", function(done) {
        var userId = "@myreallylonguseridhere:localhost";
        var uname = "myrea_10";
        existingUsernames.myreally = "@someone:else";
        for (var i = 1; i < 10; i++) {
            existingUsernames["myreal_" + i] = "@someone:else";
        }
        identGenerator.getIrcNames(ircUser, mkMatrixUser(userId)).done(function(info) {
            expect(info.username).toEqual(uname);
            done();
        });
    });

    it("should loop from '_1' to '_2' and keep the same total length", function(done) {
        var userId = "@myreallylonguseridhere:localhost";
        var uname = "myreal_2";
        existingUsernames = {
            myreally: "@someone:else",
            myreal_1: "@someone:else"
        };
        identGenerator.getIrcNames(ircUser, mkMatrixUser(userId)).done(function(info) {
            expect(info.username).toEqual(uname);
            done();
        });
    });

    it("should eventually give up trying usernames", function(done) {
        IdentGenerator.MAX_USER_NAME_LENGTH = 3;
        storeMock.getIrcClientByUsername = function() {
            return Promise.resolve({getUserId: function() { return "@someone:else"} });
        };
        var userId = "@myreallylonguseridhere:localhost";
        identGenerator.getIrcNames(ircUser, mkMatrixUser(userId)).done(function(info) {
            expect(true).toBe(false, "Promise was unexpectedly resolved.");
            done();
        }, function(err) {
            done();
        });
    });

});
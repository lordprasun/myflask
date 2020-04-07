"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require('mysql');
const util = require('util');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const token = require('./models');
/**
    * @returns an authentication object to login, get new token
    * @description This Class solves all authentication related problems
    * @param mysqldb host, user, password, database, port
    * @param mongodb url
    * @param jwt  secret, token_life, refresh_token_life, refresh_secret
    * @param auth_table table name to check user and password
*/
class Authenticate {
    constructor(imysql, imongo, ijwts, auth_table) {
        // console.log(imongo)
        this.auth_table = auth_table ? auth_table : 'user';
        // this.user_table = db.user_table ? db.user_table : 'user';
        this.jwt_secret = ijwts.secret;
        this.jwt_token_life = ijwts.token_life;
        this.jwt_refresh_secret = ijwts.refresh_secret;
        this.jwt_refresh_token_life = ijwts.refresh_token_life;
        this.mysqlconnection = mysql.createConnection({
            host: imysql.host,
            port: imysql.port,
            user: imysql.user,
            password: imysql.password,
            database: imysql.database
        });
        this.user_id = 0;
        this.query = util.promisify(this.mysqlconnection.query).bind(this.mysqlconnection);
        mongoose.connect(imongo.url, { useNewUrlParser: true, useUnifiedTopology: true });
        mongoose.Promise = global.Promise;
    }
    /**
    * @returns Auth token and User Details
    * @description Login function
    * @param email
    * @param password
    */
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mysqlconnection.connect();
            try {
                let useroObj = {};
                let authQuery = `SELECT * FROM ${this.auth_table} WHERE email = "${email}"`;
                const authRow = yield this.query(authQuery);
                if (authRow.length < 1) {
                    this.mysqlconnection.end();
                    return { status: false, message: "Email Not Found", data: {} };
                }
                if (bcrypt.compareSync(password, authRow[0].password)) {
                    this.user_id = authRow[0].user_id;
                    // const user = await this.query(`SELECT * FROM ${this.user_table} WHERE id = "${authRow[0].user_id}"`)
                    // useroObj.user_details = Object.assign({}, user[0]);;
                    useroObj.user_details = Object.assign({}, authRow[0]);
                    if (this.jwt_secret && this.jwt_token_life) {
                        useroObj.token = jwt.sign({ user_id: authRow[0].user_id }, this.jwt_secret, {
                            expiresIn: this.jwt_token_life
                        });
                    }
                    if (this.jwt_refresh_secret && this.jwt_refresh_token_life) {
                        useroObj.refresh_token = jwt.sign({ user_id: authRow[0].user_id }, this.jwt_refresh_secret, {
                            expiresIn: this.jwt_refresh_token_life
                        });
                    }
                    let result = yield tokens.findOne({ user_id: authRow[0].user_id });
                    if (result) {
                        result.refresh_token = useroObj.refresh_token;
                        result.token = useroObj.token;
                        result.last_login = new Date();
                        yield result.save();
                    }
                    else {
                        let token_details = new tokens({
                            user_id: authRow[0].user_id,
                            refresh_token: useroObj.refresh_token,
                            token: useroObj.token,
                            last_login: new Date()
                        });
                        yield token_details.save();
                    }
                    if (authRow[0].password_last_updated && authRow[0].password_last_updated.length > 0) {
                        useroObj.new_user = false;
                    }
                    else {
                        useroObj.new_user = true;
                    }
                    this.mysqlconnection.end();
                    return { status: true, message: "User Logged In Successfully", data: useroObj };
                }
                else {
                    this.mysqlconnection.end();
                    return { status: false, message: "Password Don't Match", data: {} };
                }
            }
            catch (err) {
                this.mysqlconnection.end();
                return { status: false, message: JSON.stringify(err), data: {} };
            }
        });
    }
    /**
    * @returns Goes to next command
    * @description token verifier middleware
    */
    verifyToken(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var token = req.headers['x-access-token'];
            if (!token)
                return res.status(200).send({ status: false, response_code: 0, message: "No token provided.", data: {} });
            try {
                let decoded = yield jwt.verify(token, this.jwt_secret);
                req.user_id = decoded.user_id;
                next();
            }
            catch (e) {
                return res.status(200).send({ status: false, response_code: 0, message: "Failed to authenticate token.", data: e });
            }
        });
    }
    get_new_token(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let decoded = yield jwt.verify(refresh_token, this.jwt_refresh_secret);
                let result = yield tokens.findOne({ user_id: decoded.user_id });
                if (result) {
                    if (result.refresh_token == refresh_token) {
                        var token = jwt.sign({ user_id: decoded.user_id }, this.jwt_secret, {
                            expiresIn: this.jwt_token_life
                        });
                        return { status: true, message: "New Token generated", data: { new_token: token } };
                    }
                    else {
                        return { status: false, message: "Failed to authenticate token.", data: { new_token: null } };
                    }
                }
                else {
                    return { status: false, message: "Failed to authenticate token.", data: { new_token: null } };
                }
            }
            catch (err) {
                return { status: false, message: JSON.stringify(err), data: {} };
            }
        });
    }
}
exports.Authenticate = Authenticate;

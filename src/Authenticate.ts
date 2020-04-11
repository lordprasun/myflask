const mysql = require('mysql');
const util = require('util');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const tokens = require('./models');

import { imysqldb, ijwt, imongodb, resetPassword } from './iCollections'

/**
    * @returns an authentication object to login, get new token
    * @description This Class solves all authentication related problems
    * @param mysqldb host, user, password, database, port
    * @param mongodb url
    * @param jwt  secret, token_life, refresh_token_life, refresh_secret
    * @param auth_table table name to check user and password
*/
export class Authenticate {
    mysqlconnection: any;
    query: any;
    auth_table: string;
    user_table: string;
    jwt_secret: string;
    jwt_refresh_secret: string;
    jwt_token_life: number;
    jwt_refresh_token_life: number;
    user_id: number;
    mongoUrl: string;
    mysqlObject: imysqldb;
    constructor(imysql: imysqldb, imongo: imongodb, ijwts: ijwt, auth_table?: string, user_table?: string) {
        this.auth_table = auth_table ? auth_table : 'user_account';
        this.user_table = user_table ? user_table : 'user';
        this.jwt_secret = ijwts.secret;
        this.mysqlObject = imysql;
        this.jwt_token_life = ijwts.token_life;
        this.jwt_refresh_secret = ijwts.refresh_secret;
        this.jwt_refresh_token_life = ijwts.refresh_token_life;
        this.mongoUrl = imongo.url;
        this.mysqlconnection = mysql.createConnection({
            host: imysql.host,
            port: imysql.port,
            user: imysql.user,
            password: imysql.password,
            database: imysql.database
        });
        this.user_id = 0;
        this.query = util.promisify(this.mysqlconnection.query).bind(this.mysqlconnection);
        mongoose.Promise = global.Promise;
    }
    createmysqlconnection() {
        this.mysqlconnection = mysql.createConnection(this.mysqlObject);
        this.mysqlconnection.connect();
    }
    /**
    * @returns Auth token and User Details
    * @description Login function
    * @param email 
    * @param password    
    */
    async login(email: string, password: string) {
        this.createmysqlconnection();
        mongoose.connect(this.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
        try {
            let useroObj: any = {}
            let authQuery = `SELECT * FROM ${this.auth_table} WHERE email = "${email}"`
            const authRow = await this.query(authQuery);
            if (authRow.length < 1) {
                this.mysqlconnection.end();
                mongoose.connection.close();
                return { status: false, message: "Email Not Found", data: {} }
            }
            if (bcrypt.compareSync(password, authRow[0].password)) {
                this.user_id = authRow[0].user_id;
                const user = await this.query(`SELECT * FROM ${this.user_table} WHERE id = "${authRow[0].user_id}"`)
                useroObj.user_details = Object.assign({}, user[0]);;
                // const userDetails = {
                //     id: authRow[0].id,
                //     first_name: authRow[0].first_name,
                //     last_name: authRow[0].last_name,
                //     phone: authRow[0].phone,
                //     company_id: authRow[0].company_id,
                //     role_id: authRow[0].role_id
                // }
                // useroObj.user_details = userDetails;
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
                let result = await tokens.findOne({ user_id: authRow[0].user_id });
                if (result) {
                    result.refresh_token = useroObj.refresh_token;
                    result.token = useroObj.token;
                    result.last_login = new Date();
                    await result.save();
                }
                else {
                    let token_details = new tokens({
                        user_id: authRow[0].user_id,
                        refresh_token: useroObj.refresh_token,
                        token: useroObj.token,
                        last_login: new Date()
                    })
                    await token_details.save()
                }
                if (authRow[0].password_last_updated && authRow[0].password_last_updated.length > 0) {
                    useroObj.new_user = false
                } else {
                    useroObj.new_user = true
                }
                this.mysqlconnection.end();
                mongoose.connection.close()
                return { status: true, message: "User Logged In Successfully", data: useroObj }
            } else {
                this.mysqlconnection.end();
                mongoose.connection.close()
                return { status: false, message: "Password Don't Match", data: {} }
            }
        } catch (err) {
            this.mysqlconnection.end();
            mongoose.connection.close()
            return { status: false, message: JSON.stringify(err), data: {} }
        }
    }
    /**
    * @returns Goes to next command
    * @description token verifier middleware        
    */
    async verifyToken(req: any, res: any, next: any) {
        var token = req.headers['x-access-token'];
        if (!token)
            return res.status(200).send({ status: false, response_code: 0, message: "No token provided.", data: {} });
        try {
            let decoded = await jwt.verify(token, this.jwt_secret);
            req.user_id = decoded.user_id;
            next();
        } catch (e) {
            return res.status(200).send({ status: false, response_code: 0, message: "Failed to authenticate token.", data: e });
        }
    }

    async reset_password(user_id: number, password: resetPassword) {
        this.createmysqlconnection();
        let authQuery = `SELECT password FROM ${this.auth_table} WHERE user_id=${user_id}`
        const authRow = await this.query(authQuery);
        if (bcrypt.compareSync(password.old_password, authRow[0].password)) {
            let hash = bcrypt.hashSync(password.new_password, 2);
            authQuery = `UPDATE ${this.auth_table} SET password='${hash}',password_last_updated='${new Date().toUTCString()}' WHERE user_id=${user_id}`
            console.log(authQuery)
            const authRow = await this.query(authQuery);
            console.log(authRow[0])
        }
        this.mysqlconnection.end();
        return { status: true, message: "Success", data: {} }
    }

    async forget_password(email: string) {
        try {
            this.createmysqlconnection();
            let encryptedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 2);
            let authQuery = `UPDATE ${this.auth_table} SET password = ${encryptedPassword}, password_last_updated= null WHERE email=${email}`
            let authRow = await this.query(authQuery);
            authQuery = `SELECT u.* FROM ${this.user_table} u JOIN ${this.auth_table} ua ON u.id=ua.user_id WHERE ua.email=${email}`
            authRow = await this.query(authQuery);
            return { status: true, message: "Password Update Successfully", data: { user_details: authRow[0], new_password: encryptedPassword } }
        } catch (err) {
            return { status: false, message: JSON.stringify(err), data: {} }
        }
    }

    async get_new_token(refresh_token: string) {
        try {
            let decoded = await jwt.verify(refresh_token, this.jwt_refresh_secret)
            let result = await tokens.findOne({ user_id: decoded.user_id })
            if (result) {
                if (result.refresh_token == refresh_token) {
                    var token = jwt.sign({ user_id: decoded.user_id }, this.jwt_secret, {
                        expiresIn: this.jwt_token_life
                    });
                    return { status: true, message: "New Token generated", data: { new_token: token } }
                }
                else {
                    return { status: false, message: "Failed to authenticate token.", data: { new_token: null } }
                }
            } else {
                return { status: false, message: "Failed to authenticate token.", data: { new_token: null } }
            }
        } catch (err) {
            return { status: false, message: JSON.stringify(err), data: {} }
        }

    }

    // async register(email: string, password: string, payload: iuser_table) {
    //     try {
    //         let randomstring = Math.random().toString(36).slice(-10);
    //         const saltRounds = 2;
    //         let encryptedPassword = await bcrypt.hash(randomstring, saltRounds);
    //         let cols = ''
    //         let vals = ''
    //         for (let [key, value] of Object.entries(payload)) {
    //             cols += `${key},`
    //             vals += `${vals},`
    //         }
    //         cols = cols.slice(0, -1);
    //         vals = vals.slice(0, -1)
    //         let insquery = `INSERT INTO ${this.user_table} (${cols}) VALUES (${vals})`;
    //         let result = await this.query(insquery);
    //         const user_id = result.insertId
    //         insquery = `INSERT INTO ${this.auth_table} ('user_id','email','password') VALUES (${user_id},${email},${encryptedPassword})`
    //         result = await this.query(insquery);
    //         return { status: true, message: "User Created Successfully", data: { user_id: user_id } }
    //     } catch (err) {
    //         return { status: false, message: JSON.stringify(err), data: {} }
    //     }

    // }



}
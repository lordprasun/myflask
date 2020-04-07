import { imysqldb, ijwt, imongodb } from './iCollections';
/**
    * @returns an authentication object to login, get new token
    * @description This Class solves all authentication related problems
    * @param mysqldb host, user, password, database, port
    * @param mongodb url
    * @param jwt  secret, token_life, refresh_token_life, refresh_secret
    * @param auth_table table name to check user and password
*/
export declare class Authenticate {
    mysqlconnection: any;
    query: any;
    auth_table: string;
    jwt_secret: string;
    jwt_refresh_secret: string;
    jwt_token_life: number;
    jwt_refresh_token_life: number;
    user_id: number;
    constructor(imysql: imysqldb, imongo: imongodb, ijwts: ijwt, auth_table?: string);
    /**
    * @returns Auth token and User Details
    * @description Login function
    * @param email
    * @param password
    */
    login(email: string, password: string): Promise<{
        status: boolean;
        message: string;
        data: any;
    }>;
    /**
    * @returns Goes to next command
    * @description token verifier middleware
    */
    verifyToken(req: any, res: any, next: any): Promise<any>;
    get_new_token(refresh_token: string): Promise<{
        status: boolean;
        message: string;
        data: {
            new_token: any;
        };
    } | {
        status: boolean;
        message: string;
        data: {
            new_token?: undefined;
        };
    }>;
}

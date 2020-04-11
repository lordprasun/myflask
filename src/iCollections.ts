export interface ijwt {
    secret: string,
    token_life: number,
    refresh_token_life: number,
    refresh_secret: string
}
export interface imysqldb {
    host: string,
    user: string,
    password: string,
    database: string,
    port: string,
    multipleStatements?: boolean
}

export interface imongodb {
    url: 'mongodb://wacuser:SQLdmin123!@10.0.8.114:27017/wac'
}
export interface resetPassword {
    old_password: string,
    new_password: string
}
export interface credentials {
    email: string;
    password: string

}

export interface authOption {
    new_user?: boolean,
    is_active?: boolean,
    valid_upto?: boolean
}

export interface ivarField {
    password_field?: string,
    username_field?: string,
    user_id_field?: string
}

export interface iuser_table {
    name: string,
    phone?: number,
    address?: string,
    company_id?: number
}
import 'dotenv/config'
import * as env from 'env-var'

export const envs = {
    PORT: env.get('PORT').required().asPortNumber(),
    MAILER_EMAIL:env.get('MAILER_EMAIL').required().asEmailString(),
    MAILER_SERVICE: env.get('MAILER_SERVICE').required().asString(),
    MAILER_SECRET_KEY: env.get('MAILER_SECRET_KEY').required().asString(),
    PROD: env.get('PROD').required().asBool(),
    MONGO_STRING: env.get('MONGO_STRING').required().asString(),
    MONGO_DB: env.get('MONGO_DB').required().asString()
}
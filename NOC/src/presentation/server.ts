import { CheckServiceMultiple } from "../domain/use-cases/checks/check-service-multiple";
import { SendEmailLogs } from "../domain/use-cases/emails/send-email-logs";
import { FileSystemDatasource } from "../infraestructure/datasources/file-system.datasource";
import { MongoLogDataSource } from "../infraestructure/datasources/mongo-log.datasource";
import { PostgresLogDataSource } from "../infraestructure/datasources/postgres-log.datasource";
import { LogRepositoryImpl } from "../infraestructure/repository/log.repository";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";

//cambio el nombre a logRepository
const fsLogRepository = new LogRepositoryImpl(
    new FileSystemDatasource()

)

const mongoLogRepository = new LogRepositoryImpl(
    new MongoLogDataSource()

)

const postgresLogRepository = new LogRepositoryImpl(
    new PostgresLogDataSource()

)

const arrayRepos= [fsLogRepository, mongoLogRepository, postgresLogRepository]


new PostgresLogDataSource()
    
const emailService = new EmailService()

export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            
          new CheckServiceMultiple(
           arrayRepos,
              ()=> console.log("Success!"),
              (error)=> console.log(`${error}`)
            ).execute('https://google.es')
    })


        new SendEmailLogs(emailService,arrayRepos[0]).execute(['ismaelberoncastano@gmail.com'])
        new SendEmailLogs(emailService,arrayRepos[1]).execute(['ismaelberoncastano@gmail.com'])
        new SendEmailLogs(emailService,arrayRepos[2]).execute(['ismaelberoncastano@gmail.com'])

    }
}

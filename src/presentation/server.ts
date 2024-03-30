import { CheckService } from "../domain/use-cases/checks/check-service";
import { SendEmailLogs } from "../domain/use-cases/emails/send-email-logs";
import { FileSystemDatasource } from "../infraestructure/datasources/file-system.datasource";
import { LogRepositoryImpl } from "../infraestructure/repository/log.repository";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";


const fileSystemRepository = new LogRepositoryImpl(
    new FileSystemDatasource()
    )
    
const emailService = new EmailService()

export class Server {

    public static start(){
        //CronService.createJob('*/5 * * * * *', ()=>{
            
          //  new CheckService(
            //    fileSystemRepository,
            //    ()=> console.log("Success!"),
            //    (error)=> console.log(`${error}`)
            //).execute('https://google.es')
        // })


        new SendEmailLogs(emailService, fileSystemRepository).execute(['bercast81@gmail.com'])

    }
}

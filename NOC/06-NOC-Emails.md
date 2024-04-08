# NODE_TS NOC - EMAILS

- Comento el CronService en el Server para evitar que haga mucho ruido durante el ejercicio
- Refactoricemos
- Hay cosas dolorosas, como cuando una entidad cambia
- Hay una forma de prepararse para ello
- Creo una nueva propiedad origin en LogEntity
- Necesito especificar el origen en el constructor. Puede ser el UseCase o el Service, por ejemplo
- Quiero que en mis logs aparezca en que archivo fue que yo llamé ese log (en un caso de uso, el servicio, etc)
- Si en el futuro necesitara añadir otra propiedad debería volver a cambiar el constructor yarreglar todos los inconvenientes generados en cascada
- Una solución es crear una Factory Function que reciba los argumentos que se esperan para generar una nueva instancia de la entidad
- Por ahora solo será añadir origin al constructor
- Según el Clean Code, cuando tienes 3 argumentos en un método es mejor mandar un objeto
- Creo una interfaz para tipar el objeto que mandaré en el constructor
    - createAt lo hago opcional, porque si no lo recibo lo voy a establecer
- Desestructuro de options las propiedades. Si no viene el createdAt va a ser igual a new Date
- Cuando creo la instancia en el método estatico fromJSON me da error porque recibe dos argumentos y se esperaba uno (el objeto options)
- En origin coloco el origin desestructurado, pero aquí iría el string 'log.entity'
- *NOTA*: Para que el fromJson no de error si no hay logs en el archivo, **uso un ternario**
  - También **debo colocar un return** tras evaluar la condicion en getLogsFromFile **para que no llame al fromJson** en caso de que venga vacío
- domain/entities/log.entities.ts
- 
~~~js
export enum LogSeverityLevel{
    low    = 'low',
    medium = 'medium',
    high   = 'high'
}

export interface LogEntityOptions{
     level: LogSeverityLevel 
     message: string
     createdAt?: Date
     origin: string
}


export class LogEntity{
    
   
    public level: LogSeverityLevel 
    public message: string
    public createdAt: Date
    public origin: string

    constructor(options: LogEntityOptions){
        const {message, level, createdAt = new Date(), origin}= options

        this.message = message
        this.level = level
        this.createdAt = new Date()
        this.origin = origin
    }
    
    static fromJson = (json: string): LogEntity =>{
        json = (json==='{}') ? '{}': json //para que no de error cuando esté vacio

        //para que no cree una entidad con undefined si viene el json vacio(no hay logs), evito que llame el fromJSOn en getLogsFromFile
        const {message, level, createdAt}= JSON.parse(json) 
        if(!message) throw new Error("message is required") 
        if(!level) throw new Error("message is required")
 
        const log = new LogEntity({    //le paso las propiedades al constructor en un objeto
            message: message, 
            level: level, 
            createdAt: createdAt,
            origin: origin
        }) 
   
        return log
     }
}
~~~

- En infraestructure/datasources/file-system.datasource

~~~js
private getLogsFromFile = (path: string): LogEntity[]=>{
        const content = fs.readFileSync(path, 'utf-8') 

        if(content=== "") return []//aquí si no hay contenido devuelvo un array vacío

        const logs = content.split('\n').map(LogEntity.fromJson)

        return logs
   }
~~~

- Esto va a generar una serie de errores en todos los lugares dónde usamos LogEntity. 
- En este caso es solo en el caso de uso
- Debo pasarle el objeto a las nuevas instancias de LogEntity
- domain/use-cases/checks/check-service.ts

~~~js
import { LogEntity, LogSeverityLevel } from "../../entities/log.entity"
import { LogRepository } from "../../repository/log.repository"

interface CheckServiceUseCase{
    execute(url: string):Promise <boolean>
}

type SuccessCallback = ()=> void  //tipo de lo que quiero ejecutar si todo sale bien
type ErrorCallback = (error: string)=> void //tipo si hay algún error

export class CheckService implements CheckServiceUseCase{

    constructor(
        private readonly logRepository: LogRepository,
        private readonly successCallback: SuccessCallback,
        private readonly errorCallback: ErrorCallback
        ){}
    
    
    async execute(url: string): Promise <boolean>{

        try {
            const req = await fetch(url) 
            
            if(!req.ok){
                throw new Error(`Error on check service ${url}`)
            }   
            
            //Si ha ido bien puedo guardar el log con LogRepository

            const log = new LogEntity({
                message:`Service ${url} working`, 
                level: LogSeverityLevel.low,
                origin: 'check-service.ts' })
            this.logRepository.saveLog(log)
            this.successCallback() //llamo al SuccessCallback si todo sale bien
            
            
            return true
            
        } catch (error) {
            
            const errorMessage = `${error}`
            const log = new LogEntity({  //debo pasarle el objeto a la instancia de LogEntity
                message:errorMessage, 
                level: LogSeverityLevel.low,
                origin: ' check.service.ts' })
            
            this.logRepository.saveLog(log)
            this.errorCallback(errorMessage) //llamo al ErrorCallback
            
            return false
        }

    }
}
~~~

- Podemos crear una variable para no poner el string en duro 
- Es más facil mandar estos objetos y luego usar desestructuración para refactorizar, especialmente con más de tres argumentos
-----

## Preparación de envío de correos

- En lugar de usar mailtrap o similares usaremos la propia cuenta de gmail
- Hay que hacer unas configuraciones en la política de contraseñas y las politicas de seguridad de gmail
- Ocupamos un secret_key que google nos va a dar
- Gmail Keys
    - Hay que habilitar el key y el two factor auth
    - En myAccount/seguridad/verificacion en dos pasos (hay que tener activada la verificación en dos pasos)/contraseña de aplicaciones
    - Selecciono correo y le pongo de nombre NOC
    - Copio el código en .env en MAILER_SECRET_KEY
-----

## NodeMailer

- Instalo nodemailer y los tipos con @types/nodemailer
- Creo un nuevo servicio en /presentation/email/email.service.ts
- Teniendo esto es un archivo reutilizable que puedes copiar en cualquier proyecto en el que quieras enviar mails
- Para configurar nodemailer necesitamos establecer el transporter
- Yo puedo querer cambiar estos valores dentro del transporter por lo que uso variabels de entorno
    - Recuerda poner la variable vacía en env.template para saber que hay que introducirla ya que .env no se subirá a GIT
    - Coloco la variable de entorno en env.plugin
- config/plugins/envs.plugins.ts

~~~js
import 'dotenv/config'
import * as env from 'env-var'

export const envs = {
    PORT: env.get('PORT').required().asPortNumber(),
    MAILER_EMAIL:env.get('MAILER_EMAIL').required().asEmailString(),
    MAILER_SERVICE: env.get('MAILER_SERVICE').required().asString(),
    MAILER_SECRET_KEY: env.get('MAILER_SECRET_KEY').required().asString(),
    PROD: env.get('PROD').required().asBool()
}
~~~

- El servicio 
- presentation/email/email.service.ts

~~~js
import nodemailer from 'nodemailer'
import { envs } from '../../config/plugins/envs.plugin'

interface SendEmailOptions{
    to: string
    subject: string
    htmlBody: string
    //TODO:attachments
}

export class EmailService{
    private transporter= nodemailer.createTransport({
        service: envs.MAILER_SERVICE,
        auth:{
            user: envs.MAILER_EMAIL,
            pass: envs.MAILER_SECRET_KEY
        },
        tls: {
            rejectUnauthorized: false
        }
    })

    async sendEmail(options: SendEmailOptions): Promise<boolean>{

        const {to, subject,htmlBody} = options

            try {

                const sentInformation = await this.transporter.sendMail({
                    to,
                    subject,
                    html: htmlBody
                })

                console.log(sentInformation)

                return true
            } catch (error) {

                console.log(error)
             
                return false
            }
    }
}
~~~

- Creo una nueva instancia en el server
- Lo hago así porque voy a usar inyección de dependencias, si no usaría un método estático

~~~js
import { CheckService } from "../domain/use-cases/checks/check-service";
import { FileSystemDatasource } from "../infraestructure/datasources/file-system.datasource";
import { LogRepositoryImpl } from "../infraestructure/repository/log.repository";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";


const fileSystemRepository = new LogRepositoryImpl(
    new FileSystemDatasource()
)


export class Server {

    public static start(){
        //CronService.createJob('*/5 * * * * *', ()=>{
            
          //  new CheckService(
            //    fileSystemRepository,
            //    ()=> console.log("Success!"),
            //    (error)=> console.log(`${error}`)
            //).execute('https://google.es')
        // })

        const emailService = new EmailService()

        emailService.sendEmail({
            to:'bercast81@gmail.com',
            subject: 'Logs de sistema',
            htmlBody:`
            <h3>Logs de sistema</h3>
            <p>Este es un mail para los logs de sistema</p>`
        })
    }
}
~~~

## Enviar archivos

- Hay varias maneras
- Puedo crear el archivo, crear un buffer (mirar documentación Nodemailer)
- Vamos a usar el path y el fileName
- Creo otro método en el servicio
- Creo attachments del tipo arreglo de Attachment. Lo desestructuro y lo agrego al transporter

~~~js
import nodemailer from 'nodemailer'
import { envs } from '../../config/plugins/envs.plugin'

interface SendEmailOptions{
    to: string | string[]
    subject: string
    htmlBody: string
    attachments?: Attachment[]
}

interface Attachment{
    filename?: string
    path?: string
}

export class EmailService{
    private transporter= nodemailer.createTransport({
        service: envs.MAILER_SERVICE,
        auth:{
            user: envs.MAILER_EMAIL,
            pass: envs.MAILER_SECRET_KEY
        },
        tls: {
            rejectUnauthorized: false
        }
    })

    async sendEmail(options: SendEmailOptions): Promise<boolean>{

        const {to, subject,htmlBody, attachments} = options

            try {

                const sentInformation = await this.transporter.sendMail({
                    to,
                    subject,
                    html: htmlBody,
                    attachments
                })

                console.log(sentInformation)

                return true
            } catch (error) {

                console.log(error)
             
                return false
            }
    }

    async sendemailWithFileSystemLogs(to: string | string[]){ 
            const subject= 'Logs del servidor'
            const htmlBody=`
            <h3>Logs del sistema</h3>
            <p>Desde sendEmailWithFileSystem</p>
            `

        const attachments: Attachment[]= [
            {filename: 'logs-all.log', path: './logs/logs-all.log'},
            {filename: 'logs-high.log', path: './logs/logs-high.log'},
            {filename: 'logs-medium.log', path: './logs/logs-medium.log'},
        ]
        return this.sendEmail({to, subject, attachments, htmlBody})
    }
}
~~~

- Ahora puedo usar este método con la instancia del servicio en el server

~~~js
 const emailService = new EmailService()

 emailService.sendemailWithFileSystemLogs(["bercast81@gmail.com"])
~~~

## Inyectar repositorio

- El mandar un correo electrónico es algo que también debería estar monitoreado
    - Debo poder comunicar si algo salió mal y que quede el registro
- Para ello voy a usar inyección de dependencias
- Primero lo haremos de la manera sencilla y luego la más racional
- Inyecto el LogRepository

~~~js
import nodemailer from 'nodemailer'
import { envs } from '../../config/plugins/envs.plugin'
import { LogRepository } from '../../domain/repository/log.repository'
import { LogEntity, LogSeverityLevel } from '../../domain/entities/log.entity'

interface SendEmailOptions{
    to: string | string[]
    subject: string
    htmlBody: string
    attachments?: Attachment[]
}

interface Attachment{
    filename?: string
    path?: string
}

export class EmailService{

    constructor(private readonly logRepository: LogRepository){

    }
    private transporter= nodemailer.createTransport({
        service: envs.MAILER_SERVICE,
        auth:{
            user: envs.MAILER_EMAIL,
            pass: envs.MAILER_SECRET_KEY
        },
        tls: {
            rejectUnauthorized: false
        }
    })

    async sendEmail(options: SendEmailOptions): Promise<boolean>{

        const {to, subject,htmlBody, attachments} = options

            try {

                const sentInformation = await this.transporter.sendMail({
                    to,
                    subject,
                    html: htmlBody,
                    attachments
                })

                console.log(sentInformation)

                const log = new LogEntity({
                    level: LogSeverityLevel.low,
                    message: 'Email sent',
                    origin: 'email.service'
                })
                this.logRepository.saveLog(log)

                return true
            } catch (error) {

                console.log(error)
                const log = new LogEntity({
                    level: LogSeverityLevel.low,
                    message: 'Email was no sent',
                    origin: 'email.service'
                })
                this.logRepository.saveLog(log)
             
                return false
            }
    }

    async sendemailWithFileSystemLogs(to: string | string[]){ 
            const subject= 'Logs del servidor'
            const htmlBody=`
            <h3>Logs del sistema</h3>
            <p>Desde sendEmailWithFileSystem</p>
            `

        const attachments: Attachment[]= [
            {filename: 'logs-all.log', path: './logs/logs-all.log'},
            {filename: 'logs-high.log', path: './logs/logs-high.log'},
            {filename: 'logs-medium.log', path: './logs/logs-medium.log'},
        ]

        
        return this.sendEmail({to, subject, attachments, htmlBody})
    }
}
~~~

- Inyecto el fileSystemLogRepository en la instancia del emailService en el server

~~~js
import { CheckService } from "../domain/use-cases/checks/check-service";
import { FileSystemDatasource } from "../infraestructure/datasources/file-system.datasource";
import { LogRepositoryImpl } from "../infraestructure/repository/log.repository";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";


const fileSystemRepository = new LogRepositoryImpl(
    new FileSystemDatasource()
)


export class Server {

    public static start(){
        //CronService.createJob('*/5 * * * * *', ()=>{
            
          //  new CheckService(
            //    fileSystemRepository,
            //    ()=> console.log("Success!"),
            //    (error)=> console.log(`${error}`)
            //).execute('https://google.es')
        // })

        const emailService = new EmailService(fileSystemRepository)

        emailService.sendemailWithFileSystemLogs(["bercast81@gmail.com"])

    }
}
~~~
----

## SendEmail use-case

- Podría funcionar así tal cual, pero puedo crear un caso de uso
- Creo en domain/use-cases/logs/emails/send-email-logs.ts
- Usualmente son los casos de uso que llaman al repositorio
- Entonces debo inyectar el servicio y el repositorio
- domain/use-cases/emails/send-email.logs.ts

~~~js
import { EmailService } from "../../../presentation/email/email.service"
import { LogEntity, LogSeverityLevel } from "../../entities/log.entity"
import { LogRepository } from "../../repository/log.repository"

interface SendLogEmailUseCase{
    execute: (to: string | string[])=> Promise<boolean>

}

export class SendEmailLogs implements SendLogEmailUseCase{

    constructor(
        private readonly emailService: EmailService,
        private readonly logRepository: LogRepository
    ){}

    async execute(to: string | string[]){

        try {
            
           const sent = await this.emailService.sendemailWithFileSystemLogs(to) //regresa un boolean
           if(!sent){
            throw new Error('Email log not sent')
           }
           return true
            
        } catch (error) {
            const log = new LogEntity({
                message: `${error}`, 
                level: LogSeverityLevel.medium,
                origin: 'send-email-logs'
            })

            this.logRepository.saveLog(log)
            return false
        }


        return true
    }
}
~~~

- Puedo mandar también un log conforme el mail se mandó exitosamente

~~~js
 async execute(to: string | string[]){

        try {
            
           const sent = await this.emailService.sendemailWithFileSystemLogs(to) //regresa un boolean
           if(!sent){
            throw new Error('Email log not sent')
           }

           const log = new LogEntity({
            message: `Log email sent`, 
            level: LogSeverityLevel.medium,
            origin: 'send-email-logs'
        })

        this.logRepository.saveLog(log)
           return true
            
        } catch (error) {
            const log = new LogEntity({
                message: `${error}`, 
                level: LogSeverityLevel.medium,
                origin: 'send-email-logs'
            })

            this.logRepository.saveLog(log)
            return false
        }


        return true
    }
~~~

- Ahora EmailService no necesita la inyección de dependencias 

~~~js
import nodemailer from 'nodemailer'
import { envs } from '../../config/plugins/envs.plugin'
import { LogRepository } from '../../domain/repository/log.repository'
import { LogEntity, LogSeverityLevel } from '../../domain/entities/log.entity'

interface SendEmailOptions{
    to: string | string[]
    subject: string
    htmlBody: string
    attachments?: Attachment[]
}

interface Attachment{
    filename?: string
    path?: string
}

export class EmailService{

    constructor(){  //borro la inyección de dependencias

    }
    private transporter= nodemailer.createTransport({
        service: envs.MAILER_SERVICE,
        auth:{
            user: envs.MAILER_EMAIL,
            pass: envs.MAILER_SECRET_KEY
        },
        tls: {
            rejectUnauthorized: false
        }
    })

    async sendEmail(options: SendEmailOptions): Promise<boolean>{

        const {to, subject,htmlBody, attachments} = options

            try {

                const sentInformation = await this.transporter.sendMail({
                    to,
                    subject,
                    html: htmlBody,
                    attachments
                })

                console.log(sentInformation)

                const log = new LogEntity({
                    level: LogSeverityLevel.low,
                    message: 'Email sent',
                    origin: 'email.service'
                })
               // this.logRepository.saveLog(log)

                return true
            } catch (error) {

                console.log(error)
                const log = new LogEntity({
                    level: LogSeverityLevel.low,
                    message: 'Email was no sent',
                    origin: 'email.service'
                })
                //this.logRepository.saveLog(log)
             
                return false
            }
    }

    async sendemailWithFileSystemLogs(to: string | string[]){ 
            const subject= 'Logs del servidor'
            const htmlBody=`
            <h3>Logs del sistema</h3>
            <p>Desde sendEmailWithFileSystem</p>
            `

        const attachments: Attachment[]= [
            {filename: 'logs-all.log', path: './logs/logs-all.log'},
            {filename: 'logs-high.log', path: './logs/logs-high.log'},
            {filename: 'logs-medium.log', path: './logs/logs-medium.log'},
        ]

        
        return this.sendEmail({to, subject, attachments, htmlBody})
    }
}
~~~

- En el Server coloco la instancia del servicio fuera de la clase y llamo a mi caso de uso

~~~js
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
~~~




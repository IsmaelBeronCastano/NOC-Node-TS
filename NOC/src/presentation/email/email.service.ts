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
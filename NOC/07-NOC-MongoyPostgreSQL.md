# NOC - Mongo y PostgreSQL

- Conexion con mongo
- Creo la interfaz para evitar dependencias 
- data/mongo/init.ts

~~~js
import mongoose from "mongoose";


interface ConnectionOptions{
    mongoUrl: string
    dbName: string
}

export class MongoDatabase{

    
    static async connect(options:ConnectionOptions){
        const {mongoUrl, dbName} = options 

        try {
            
            return await mongoose.connect(mongoUrl,{
                dbName   //en este objeto se pueden configurar otras cosas
            })
            
        } catch (error) {
            console.log('Mongo connection error')
            throw error
        }
    }
}
~~~

- Para conectarme a mongo, en app, antes del server.
- Añado las variables de entorno en el plugin. En .env defino las variables de entorno MONGO_STRING y MONGO_DB
- config/plugins/envs.plugin.ts

~~~js
 MONGO_STRING: env.get('MONGO_STRING').required().asString(),
 MONGO_DB: env.get('MONGO_DB').required().asString()
~~~

- En app.ts

~~~js
import { envs } from "./config/plugins/envs.plugin"
import { MongoDatabase } from "./data/mongo"
import { Server } from "./presentation/server"

(async ()=>{
    main()
})()

async function main(){

    await MongoDatabase.connect(
        {
            mongoUrl:envs.MONGO_STRING, dbName: envs.MONGO_DB
        }) 
    Server.start()
    console.log(envs.PORT)
}
~~~
----

## Schema & Models

- Creo mongo/models/log.model.ts
- Debo tener la data que se muestra en la interface LogEntity
- domain/entities/log.entity.ts

~~~js
export interface LogEntityOptions{
     level: LogSeverityLevel 
     message: string
     createdAt?: Date
     origin: string
}
~~~

- Creemos el modelo 
- data/mongo/models/log.model.ts

~~~js
import mongoose from "mongoose";
import { LogSeverityLevel } from "../../../domain/entities/log.entity";


const LogSchema = new mongoose.Schema({
    

    level: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    }, 
    
    message: {
        type: String,
        required: true
    },
    
    createdAt: {
        type: Date,
        default: new Date()
    },
    
    origin: {
        type: String,
        
    },
})
export const LogModel = mongoose.model('Log', LogSchema) //por defecto mongoose le añadirá la s de plural a Log
~~~
----

## Crear y leer de mongo

- Creo un registro en el app.ts

~~~js
import { envs } from "./config/plugins/envs.plugin"
import { LogModel, MongoDatabase } from "./data/mongo"
import { Server } from "./presentation/server"

(async ()=>{
    main()
})()

async function main(){

    await MongoDatabase.connect(
        {
            mongoUrl:envs.MONGO_STRING, dbName: envs.MONGO_DB
        }) 

        //después de este ejemplo borraré este código y dejaré solo la conexión
        const newLog = await LogModel.create({
            message: "test message mongoose",
            origin: "app.ts",
            level: 'low'
        })

        await newLog.save()

        const logs = await LogModel.find()

        console.log({
            newLog,
            logs
        })



    Server.start()
  
}
~~~

- Debemos construir un datasource que implemente la clase abstracta domain/datasources/LogDatasource
- En domain establezco las normas

~~~js
import { LogEntity, LogSeverityLevel } from "../entities/log.entity";

export abstract class LogDataSource{
    
    //cualquier origen de datos va a tener que implementar saveLog
    abstract saveLog(log: LogEntity): Promise<void>;
    abstract getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]>
}
~~~
-------

## MongoLogDatasource

- Creo en infraestructure/datasources/mongo-log.datasouce.ts
- Implemento los dos métodos usando el modelo

~~~js
import { LogModel } from "../../data/mongo";
import { LogDataSource } from "../../domain/datasources/log.datasource";
import { LogEntity, LogSeverityLevel } from "../../domain/entities/log.entity";

 export class MongoLogDataSource implements LogDataSource {

    async saveLog(log:LogEntity): Promise<void>{
        const newLog = await LogModel.create(log) //este log no es una instancia de nuestra entidad
                                                  //es una instancia del modelo de mongoose
        newLog.save() 
        return

    }
    async getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]>{
        const logs= await LogModel.find({level:severityLevel}) 
        return logs //esto marca error porque devuelve logs pero no son instancias de LogEntity
    }

 }
~~~

- Creo un método en domain/datasource/LogEntity para crear entidades de un JSON
- 
~~~js
static fromObject=(object: {[key:string]:any}):LogEntity=>{
        const {message, level, createdAt, origin} = object

        if(!message) throw new Error("¡Falta el mensaje!")
        
            const log = new LogEntity({
            message,
            level,
            createdAt,
            origin
        })

        return log
     }
~~~

- Ahora puedo usarlo sin instanciar la clase (porque es static) y devolver un arreglo de entidades

~~~js
import { log } from "console";
import { LogModel } from "../../data/mongo";
import { LogDataSource } from "../../domain/datasources/log.datasource";
import { LogEntity, LogSeverityLevel } from "../../domain/entities/log.entity";

 export class MongoLogDataSource implements LogDataSource {

    async saveLog(log:LogEntity): Promise<void>{
        const newLog = await LogModel.create(log) //este log no es una instancia de nuestra entidad
                                                  //es una instancia del modelo de mongoose
        newLog.save() 
        return

    }
    async getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]>{
        const logs= await LogModel.find({level:severityLevel}) 

        return logs.map(log=> LogEntity.fromObject(log))
    }

 }
~~~
----

## Grabar logs en Mongo

- Inicio el servidor en app.ts con Server.start()
- Cambio el nombre del fileSystemRepository a logRepository en server.ts

~~~js
//cambio el nombre a logRepository
const fileSystemRepository = new LogRepositoryImpl(
    new FileSystemDatasource()
    )
    
const emailService = new EmailService()
~~~

- De esta manera puedo añadirle la nueva instancia de mongo sin alterar el resto del código, ya que le paso el repositorio al caso de uso del envio de mails y al servcio de check más abajo. Con un nombre más genérico es más adecuado

~~~js
import { CheckService } from "../domain/use-cases/checks/check-service";
import { SendEmailLogs } from "../domain/use-cases/emails/send-email-logs";
import { FileSystemDatasource } from "../infraestructure/datasources/file-system.datasource";
import { MongoLogDataSource } from "../infraestructure/datasources/mongo-log.datasource";
import { LogRepositoryImpl } from "../infraestructure/repository/log.repository";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";

//cambio el nombre a logRepository
const logRepository = new LogRepositoryImpl(
    //new FileSystemDatasource()

    new MongoLogDataSource()
    )
    
const emailService = new EmailService()

export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            
          new CheckService(
          logRepository,
              ()=> console.log("Success!"),
              (error)=> console.log(`${error}`)
            ).execute('https://google.es')
    })


        new SendEmailLogs(emailService, logRepository).execute(['ismaelberoncastano@gmail.com'])

    }
}
~~~

- 
-------

## PostgreSQL

- Usaremos TypeORM y Docker
- En la raiz del proyecto: docker-compose.yaml

~~~yaml
version: '3.8'
services:
  db:
    image: postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./postgres:/var/lib/postgresql/data
    ports:
      - 5432:5432
~~~

- Coloco las variables de entorno en .env
- potgres es el usuario por defecto

~~~
POSTGRES_USER=potgres
POSTGRES_PASSWORD=123456
POSTGRES_DB=NOC
POSTGRES_URL=postgresql://potgres:123456@localhost:5432/NOC
~~~

- Para probar la instalacion usaré tablePlus
  - Name: NOC-PostgreSQL
  - Host: localhost
  - Port: 5432
  - User: postgres
  - Password: 123456
  - Database: NOC

- Para correr la db uso ****
- Usaremos Prisma - ORM

> npm i prisma
> npx prisma init
> npx prisma init --datasource-provider PostgreSQL

- Hay que modelar el schema
- Coloco la variable de entorno del string de conexion en el schema.prisma
- Consulto la documentación
- Creo el modelo de Log siguiendo la log.entity
- Prisma recomienda hacer los enums en mayúsculas

~~~prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
}

enum SeverityLevel{
  LOW
  MEDIUM
  HIGH
}

model LogModel {
  id      Int @id @default(autoincrement())
  message String
  origin  String
  level   SeverityLevel
  createdAt DateTime   @default(now())
}
~~~

- Haciendo mi modelo simularía que no tengo la DB creada
- Si ya tuvieramos la DB creada podriamos hacer el npx primsa pull para crear todos los objetos
- Como no tenemos Db haremos la migración

> npx prisma migrate dev --name init

- Con la migración se crea el Prisma Client, que es lo que necesitamos para trabajar con la DB
- Si algo sale mal se pueden rvertir las migraciones
- En TablePlus puedo ver la migracion y LogModel
-----

## Inserción y lectura

- Probemos en app.ts

~~~js
import { PrismaClient } from "@prisma/client"
import { envs } from "./config/plugins/envs.plugin"
import { LogModel, MongoDatabase } from "./data/mongo"
import { Server } from "./presentation/server"

(async ()=>{
    main()
})()

async function main(){

    await MongoDatabase.connect(
        {
            mongoUrl:envs.MONGO_STRING, dbName: envs.MONGO_DB
        }) 

        const prisma = new PrismaClient()

        const newLog = await prisma.logModel.create({
            data:{
            message:"test message",
            origin:"app.ts postgres",
            level:"LOW"}
        })

        const logs = await prisma.logModel.findMany({})
        
        
        const logsLOW = await prisma.logModel.findMany({
            where:{
                level: "LOW"
            }
        })
        console.log({
            logs,
            logsLOW
        })
    //Server.start()
  
}
~~~

- Pongo en marcha el servidor para que lo inserte en la db
-----

## PotgresLogDatasource

- El severityLevel creado en prisma no es compatible con lo que definimos en LogEntity
- Hay que hacer una conversión
- En getLogs si devuelvo dbLogs en un return tal cual, regresa instancias pero no entidades (aunque no está muy lejos de ello)
- Uso el metodo estático de LogEntity fromoObject

~~~js
import { LogModel, PrismaClient, SeverityLevel } from "@prisma/client";
import { LogEntity, LogSeverityLevel } from "../../domain/entities/log.entity";

const prisma = new PrismaClient()

const severityEnum = {
    low: SeverityLevel.LOW,
    medium: SeverityLevel.MEDIUM,
    high: SeverityLevel.HIGH,
}

export class PostgresLogDataSource{
    
   
     async saveLog(log: LogEntity): Promise<void>{
        
         const level = severityEnum[log.level]
        
         const newLog = await prisma.logModel.create({

            data:{
                ...log,
                level
            }
        })
        
        
     }

     async getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]>{
        const level = severityEnum[severityLevel]

        const dbLogs = await prisma.logModel.findMany({
            where:{
                level
            }
        })

        return dbLogs.map(dbLog => LogEntity.fromObject(dbLog))
     }
}
~~~

- Debo crear una nueva instancia de logRepository en el server

~~~js
import { CheckService } from "../domain/use-cases/checks/check-service";
import { SendEmailLogs } from "../domain/use-cases/emails/send-email-logs";
import { FileSystemDatasource } from "../infraestructure/datasources/file-system.datasource";
import { MongoLogDataSource } from "../infraestructure/datasources/mongo-log.datasource";
import { PostgresLogDataSource } from "../infraestructure/datasources/postgres-log.datasource";
import { LogRepositoryImpl } from "../infraestructure/repository/log.repository";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";

//cambio el nombre a logRepository
const logRepository = new LogRepositoryImpl(
    //new FileSystemDatasource()


    //new MongoLogDataSource()

    new PostgresLogDataSource()

)
    
const emailService = new EmailService()

export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            
          new CheckService(
          logRepository,
              ()=> console.log("Success!"),
              (error)=> console.log(`${error}`)
            ).execute('https://google.es')
    })


        new SendEmailLogs(emailService, logRepository).execute(['ismaelberoncastano@gmail.com'])

    }
}
~~~

- En app.ts descomento Server.start y pongo en marcha el servidor
----

## Grabar en Mongo, Postgres y FS simultáneamente

- Hagamos un caso de uso en el que usemos todos los repositorios
- domain/use-cases/checks/check-service-multiple.ts
- Lo unico diferente con CheckServiceUseCase es que voy a recibir un arreglo de repositorios
- Creo un metodo privado callLogs para barrer el arreglo de repositorios y guardar en todos ellos

~~~js
import { LogEntity, LogSeverityLevel } from "../../entities/log.entity"
import { LogRepository } from "../../repository/log.repository"

interface CheckServiceMultipleUseCase{
    execute(url: string):Promise <boolean>
}

type SuccessCallback = ()=> void  //tipo de lo que quiero ejecutar si todo sale bien
type ErrorCallback = (error: string)=> void //tipo si hay algún error

export class CheckServiceMultiple implements CheckServiceMultipleUseCase{

    constructor(
        private readonly logRepository: LogRepository[],
        private readonly successCallback: SuccessCallback,
        private readonly errorCallback: ErrorCallback
        ){}
    

        async callLogs(log:LogEntity){
            this.logRepository.forEach((logRepository)=>{
                logRepository.saveLog(log)
            })
        }
    
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

        //this.logRepository.saveLog(log)
            this.callLogs(log)
            this.successCallback() //llamo al SuccessCallback si todo sale bien
            
            
            return true
            
        } catch (error) {
            
            const errorMessage = `${error}`
            const log = new LogEntity({  //debo pasarle el objeto a la instancia de LogEntity
                message:errorMessage, 
                level: LogSeverityLevel.low,
                origin: ' check.service.ts' })
            
            //this.logRepository.saveLog(log)
            this.callLogs(log)
            this.errorCallback(errorMessage) //llamo al ErrorCallback
            
            return false
        }

    }
}
~~~

- En server.ts necesito mandar un arreglo con todos los repositorios

~~~~js
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
~~~



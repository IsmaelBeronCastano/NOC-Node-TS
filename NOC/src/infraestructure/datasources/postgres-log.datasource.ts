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
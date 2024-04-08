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

 





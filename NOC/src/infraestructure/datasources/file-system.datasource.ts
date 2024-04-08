import { LogDataSource } from "../../domain/datasources/log.datasource";
import { LogEntity, LogSeverityLevel } from "../../domain/entities/log.entity";
import fs from 'fs'

export class FileSystemDatasource implements LogDataSource{

    private readonly logPath = 'logs/' //mis logs se grabarán en este PATH
    private readonly allLogsPath = 'logs/logs-all.log'
    private readonly mediumLogsPath = 'logs/logs-medium.log'
    private readonly highLogsPath = 'logs/logs-high.log'

  
    constructor(){
        this.createLogsFiles() //cuando se genere una instancia llamaremos al método para que verifique si existe logs/ y si no existe lo crée
    }


    //es private porque no quiero que se use fuera de este Datasource
    private createLogsFiles =()=>{
        
        if(!fs.existsSync(this.logPath)){
            fs.mkdirSync(this.logPath)
        }

        [
            this.allLogsPath,
            this.mediumLogsPath,
            this.highLogsPath
        ].forEach(path =>{
            if(fs.existsSync(path)) return
               fs.writeFileSync(path, '') //si no existe creo el archivo y le inserto un string vacío
        })
    }

   async saveLog(newLog: LogEntity): Promise<void> {

        const logAsJson = `${JSON.stringify(newLog)}\n`
        fs.appendFileSync(this.allLogsPath, logAsJson)

        if(newLog.level === LogSeverityLevel.low) return
        if(newLog.level === LogSeverityLevel.medium){
            fs.appendFileSync(this.mediumLogsPath, logAsJson)
        }else{
            fs.appendFileSync(this.highLogsPath, logAsJson)            
        }
        return
    }
    

   private getLogsFromFile = (path: string): LogEntity[]=>{
        const content = fs.readFileSync(path, 'utf-8') 

        if(content=== "") return []//aquí si no hay contenido devuelvo un array vacío

        const logs = content.split('\n').map(LogEntity.fromJson)

        return logs
   }
   async getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]> {
       
        switch (severityLevel) {
            case LogSeverityLevel.low:
                
            return this.getLogsFromFile(this.allLogsPath)
                
            case LogSeverityLevel.medium:
                
            return this.getLogsFromFile(this.mediumLogsPath)

            case LogSeverityLevel.high:
            
            return this.getLogsFromFile(this.highLogsPath)
                    
            default:

            throw new Error(`${severityLevel} not implemented`)
            
        }
    }
}


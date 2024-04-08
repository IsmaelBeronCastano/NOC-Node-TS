import { LogEntity, LogSeverityLevel } from "../entities/log.entity";

export abstract class LogRepository{
    
    //Me permite llamar métodos que hay en el datasource
    abstract saveLog(log: LogEntity): Promise<void>;
    abstract getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]>
}
import { LogEntity, LogSeverityLevel } from "../entities/log.entity";

export abstract class LogDataSource{
    
    //cualquier origen de datos va a tener que implementar saveLog
    abstract saveLog(log: LogEntity): Promise<void>;
    abstract getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]>
}
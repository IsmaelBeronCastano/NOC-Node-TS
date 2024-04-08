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
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
}
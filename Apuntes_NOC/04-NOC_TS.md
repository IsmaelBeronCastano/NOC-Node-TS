# NODE_TS - NOC

- Instalaciones necesarias (sin nodemon)

> npm init -y
> npm i -D typescript @types/node ts-node-dev rimraf
> npx tsc --init --outDir dist/ --rootDir src

- Scripts

~~~json
"dev": "tsnd --respawn src/app.ts",
"build": "rimraf ./dist && tsc",
"start": "npm run build && node dist/app.js"
~~~

- En el ts-config, fuera del "compilerOptions" excluyo los node_modules y la dist/ e incluyo el src

~~~json
"exclude": [
    "node_modules",
    "dist"
],
"include":[
    "src"
]
~~~
----

## Main - Server app

- Para esta aplicación vamos a hacer uso de arquitectura limpia y el patrón repositorio
- Creo la carpeta presentation con server.ts
- Creo la clase Server con el método start
- Poner public en el método es redundante ya que por defecto es un método público, pero ayuda a la legibilidad
- Con static no necesito hacer una instancia de la clase y puedo ussar el método directamente con Server
- server.ts
  
~~~js
export class Server {

    public static start(){
        
        console.log("Server started!")
    }
}
~~~

- Pongo en marcha el servidor con .start() en app.ts llamando a main dentro de función autoinvocada (puede ser async)

~~~js
import { Server } from "./presentation/server"

(async ()=>{
    main()
})()

function main(){
    Server.start()
}
~~~
-------

## CRON Tasks

> npm i cron 

- Uso CronJob
- Los asteriscos se refieren a los segundos, minutos, horas, etc (mirar documentación)

~~~js
import { CronJob } from "cron"

export class Server {

    public static start(){
        const job = new CronJob( 
            '*/2 * * * * *', //cada 2 segundos
            ()=>{
                const date = new Date()
                console.log('2 seconds', date)
            }
        )

        job.start()
    }
}
~~~

- De esta manera el código **está fuertemente acoplado**
- Siempre que uses librerías de terceros usa **EL PATRÓN ADAPTADOR**
- Creo la carpeta cron dentro de presentation (capa de presentación, de cara al usuario) con el archivo cron-service.ts
- Creo la clase CronService. Cómo no voy a usar inyección de dependencias (no necesito instancia), solo quiero un método, lo hago estático 
- **Retorno el job** por si quiero luego usar el .stop para detenerlo
- Pego el código del método start del server

~~~js
import { CronJob } from "cron"

export class CronService{
   
    static createJob(): CronJob{
        
        const job = new CronJob( 
            '*/2 * * * * *', //cada 2 segundos
            ()=>{
                const date = new Date()
                console.log('2 seconds', date)
            }
        )

        job.start()

        return job
    }
}
~~~

- Lo llamo en el server

~~~js
import { CronService } from "./cron/cron-service";


export class Server {

    public static start(){
        CronService.createJob()
    }
}
~~~

- **NOTA:**  **con CTRL + click encima de un método o clase voy a la información de las definiciones de TypeScript en index.d.ts**
- Necesito pasarle los parámetros al createJob para configurar el tiempo (**cronTime**) que quiero para que se ejcute cada vez, y la función que es **onTick**
- Necesito tipar estos dos parámetros. Cuando son objetos es mejor **interfaces**, pero cuando es un tipo de dato es mejor con un **type**
- Cuando hay **más de dos argumentos** se recomienda **usar un objeto y mandar un único argumento**

~~~js
import { CronJob } from "cron"


type CronTime = string | Date;
type OnTick = ()=> void

export class CronService{
   
    static createJob(cronTime: CronTime, onTick: OnTick ): CronJob {
        
        const job = new CronJob( cronTime, onTick)

        job.start()

        return job
    }
}
~~~

- Obviamente en server tengo que pasarle los parámetros al método createJob

~~~js
import { CronService } from "./cron/cron-service";


export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            const date = new Date();
            console.log('5 seconds', date)
        })
    }
}
~~~

- Hemos **aplicado el patrón adaptador**
- cron tiene algo llamado ChildProcess que permite el multihilo
------

## CheckService - UseCase

- Los casos de uso los colocaremos en la capa de dominio (src/**domain**/**use-cases**)
- Dentro de use-cases voy a ir creando diferemtes carpetas según el caso de uso, checks, logs, etc
- Creo un método **async** al que le paso la url de mi web (por ejemplo, para chequear que funciona) y devuelve una promesa con un valor booleano
- Si la web no estuviera operativa me gustaría enviar un email o crear un log, notificar de alguna manera, al menos después de 5 intentos (por ejemplo)
- Esto es **un caso de uso**, un código dedicado a una tarea en específico
- Siempre es bueno crear interfaces para determinar cierto comportamiento y ayudar a comprender el código a otras personas
- No hago el código estático porque si voy a hacer inyección de dependencias
- Uso un **try catch**

~~~js
interface CheckServiceUseCase{
    execute(url: string):Promise <boolean>
}

export class CheckService implements CheckServiceUseCase{
    
    
    async execute(url: string): Promise <boolean>{

        try {
            const req = await fetch(url) 
            
            if(!req.ok){
                throw new Error(`Error on check service ${url}`)
            }   
            
            console.log(`${url} is ok!`)
            return true
        
        } catch (error) {
            console.log(`${error}`)
            
            return false
        }

    }
}
~~~

- Ahora llamo este caso de uso en el server

~~~js
import { CheckService } from "../domain/use-cases/checks/check-service";
import { CronService } from "./cron/cron-service";


export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            
            new CheckService().execute('https://google.com')
        })
    }
}
~~~ 

- **Resumen**:
  - Creamos el **Server** en la capa de presentación
  - Creamos el **CronService** para realizar **el patrón adaptador** con la librería cron
    - **Defino los tipos de los argumentos** del método estático
    - **Pongo en marcha el servicio** de cron dentro del método con una nueva instancia pasándole los argumentos como parámetros y llamando a **.start**
    - **Retorno el job** por si quiero hacer algo con el cómo usar .stop
  - Creo el primer **caso de uso en la capa de dominio, CheckService**
    - Implemento una **interfaz** con el único método execute al que le paso una url
    - No lo hago estático porque quiero inyectarlo
    - En un **try catch hago el fetch** de la url pasada
    - Si el fetch no me devuelve el ok en la request mando **un error**. **Devuelvo un true**  
    - Si el catch pilla un error, lo imprimo
    - Llamo al método **generando una nueva instancia del CheckService pasándole la url** al método **execute**
-----

## JSON-Server

- Para testear el servicio y montar un server REST API usaremos JSON Server
- Creo una nueva carpeta, hago el npm init -y 

> npm i json-server

- Creo el db.json y copio el contenido de la web de ejemplo
- Para levantar el server creo el script

~~~json
"start": "json-server --watch db.json"
~~~

- Cambio la url del servicio (caso de uso) CheckService

~~~js
export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            
            new CheckService().execute('http://localhost:3000')
        })
    }
}
~~~
------

## Inyección de dependencias

- La inyección de dependencias es colocar una dependencia en los casos de uso, repositorios, data sources, etc
- Se suele realizar en un **constructor**
- Tipo los casos de si sale bien y si hay un error
- Voy a recibir estos dos argumentos en el constructor del CheckService
- Uso **private readonly** porque yo no quiero cambiar el SuccessCallback accidentalmente
- LLamo a las funciones en sus lugares correspondientes 

~~~js
interface CheckServiceUseCase{
    execute(url: string):Promise <boolean>
}

type SuccessCallback = ()=> void  //tipo de lo que quiero ejecutar si todo sale bien
type ErrorCallback = (error: string)=> void //tipo si hay algún error

export class CheckService implements CheckServiceUseCase{

    constructor(
        private readonly successCallback: SuccessCallback,
        private readonly errorCallback: ErrorCallback
        ){}
    
    
    async execute(url: string): Promise <boolean>{

        try {
            const req = await fetch(url) 
            
            if(!req.ok){
                throw new Error(`Error on check service ${url}`)
            }   
            
            this.successCallback() //llamo al SuccessCallback
           
            
            return true
        
        } catch (error) {
            
            this.errorCallback(`${error}`) //llamo al ErrorCallback
            
            return false
        }

    }
}
~~~

- Ahora solo tengo que pasarle las funciones al crear la instancia de CheckService

~~~js
import { CheckService } from "../domain/use-cases/checks/check-service";
import { CronService } from "./cron/cron-service";


export class Server {

    public static start(){
        CronService.createJob('*/5 * * * * *', ()=>{
            
            new CheckService(
                ()=> console.log("Success!"),
                (error)=> console.log(`${error}`)
            ).execute('http://localhost:3000')
        })
    }
}
~~~

- El objetivo de todo esto es separar responsabilidades
-------

## Cierre de sección

- Los logs en consola son útiles pero si tuvieramos varios servicios generaría mucho ruido y tampoco es conveniente
- El caso de uso debería recibir **dónde es que quiero grabar estos logs**
- Vamos a usar una de las funciones (SuccessCallback o ErrorCallback) para grabar en la DB con un sistema personalizado de logs mediante inyección de dependencias
------



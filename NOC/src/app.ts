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

       

     
  


    Server.start()
  
}
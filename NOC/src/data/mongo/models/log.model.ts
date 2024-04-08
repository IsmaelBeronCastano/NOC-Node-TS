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


export const LogModel = mongoose.model('Log', LogSchema)
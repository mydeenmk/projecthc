const mongoose=require('mongoose');


const otpSchema = new mongoose.Schema({
    phonenumber:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    },

    otpExpiration:{
            type:String,
            default: Date.now,
            get:(otpExpiration)=> otpExpiration.getTime(),
            set:(otpExpiration)=> new Date(otpExpiration)
    }

})

module.exports= mongoose.model('otp',otpSchema);    
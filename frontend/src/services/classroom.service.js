import { API_URL } from "@config/api"
import axios from "axios"


const ClassroomService = {
    createClassRoom(data){
        return(
            service(axios.post(API_URL + "/classroom", data))
        )
    },

}

export default ClassroomService
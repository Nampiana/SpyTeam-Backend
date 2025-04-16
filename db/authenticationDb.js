
import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config({ path: "config.env" });

export const connectWithRetryMongo = () => {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local-development') {
        mongoose
            .connect(`${process.env.DB_CONNECTION_LOCAL}`)
            .then(() => console.log("DB connection successful!"))
            .catch((err) => {
                console.log(err);
            });
    } else if (process.env.NODE_ENV === 'prod') {
        mongoose
            .connect(`mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
            .then(() => console.log("DB connection successful!"))
            .catch((err) => {
                console.log(err);
            });
    }
};

export default { connectWithRetryMongo }